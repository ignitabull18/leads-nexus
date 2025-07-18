-- Enable Row Level Security on tables
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_metadata ENABLE ROW LEVEL SECURITY;

-- Create roles for different access levels
-- Note: In production, these would be actual database roles
-- For now, we'll create policies that can be used with JWT claims

-- Policy for authenticated users to read all leads
CREATE POLICY "authenticated_read_leads" ON leads
  FOR SELECT
  USING (true); -- In production, this would check auth.jwt() claims

-- Policy for authenticated users to insert their own leads
CREATE POLICY "authenticated_insert_leads" ON leads
  FOR INSERT
  WITH CHECK (true); -- In production, this would validate ownership

-- Policy for authenticated users to update their own leads
CREATE POLICY "authenticated_update_leads" ON leads
  FOR UPDATE
  USING (true) -- In production: check ownership
  WITH CHECK (true); -- In production: validate updates

-- Policy for authenticated users to delete their own leads
CREATE POLICY "authenticated_delete_leads" ON leads
  FOR DELETE
  USING (true); -- In production: check ownership

-- Policies for lead_metadata table
CREATE POLICY "authenticated_read_lead_metadata" ON lead_metadata
  FOR SELECT
  USING (true); -- Can read all relationships

CREATE POLICY "authenticated_insert_lead_metadata" ON lead_metadata
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM leads 
      WHERE id IN (lead_id, related_lead_id)
    )
  ); -- Ensure both leads exist

CREATE POLICY "authenticated_update_lead_metadata" ON lead_metadata
  FOR UPDATE
  USING (true)
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM leads 
      WHERE id IN (lead_id, related_lead_id)
    )
  );

CREATE POLICY "authenticated_delete_lead_metadata" ON lead_metadata
  FOR DELETE
  USING (true);

-- Create audit log table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  operation text NOT NULL,
  user_id text,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  query text,
  created_at timestamptz DEFAULT now()
);

-- Create index for audit log queries
CREATE INDEX idx_audit_logs_table_operation ON audit_logs(table_name, operation);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Create audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS trigger AS $$
BEGIN
  INSERT INTO audit_logs (
    table_name,
    operation,
    user_id,
    record_id,
    old_data,
    new_data,
    query
  ) VALUES (
    TG_TABLE_NAME,
    TG_OP,
    current_setting('app.current_user_id', true),
    CASE 
      WHEN TG_OP = 'DELETE' THEN OLD.id
      ELSE NEW.id
    END,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END,
    current_query()
  );
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit triggers for sensitive operations
CREATE TRIGGER audit_leads_insert
  AFTER INSERT ON leads
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_leads_update
  AFTER UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_leads_delete
  AFTER DELETE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_lead_metadata_changes
  AFTER INSERT OR UPDATE OR DELETE ON lead_metadata
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_function();