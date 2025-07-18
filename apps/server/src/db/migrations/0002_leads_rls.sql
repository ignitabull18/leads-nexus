-- Enable RLS on the leads table
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- SELECT: Allow all authenticated users to view leads
CREATE POLICY "Allow authenticated read access" 
ON public.leads 
FOR SELECT 
TO authenticated 
USING (true);

-- INSERT: Allow users to insert if they have 'leads.create' permission
CREATE POLICY "Allow insert based on permission" 
ON public.leads 
FOR INSERT 
TO authenticated 
WITH CHECK (authorize('leads.create'));

-- UPDATE: Allow users to update if they have 'leads.edit' permission
CREATE POLICY "Allow update based on permission" 
ON public.leads 
FOR UPDATE 
TO authenticated 
USING (authorize('leads.edit'));

-- DELETE: Allow users to delete if they have 'leads.delete' permission
CREATE POLICY "Allow delete based on permission" 
ON public.leads 
FOR DELETE 
TO authenticated 
USING (authorize('leads.delete')); 