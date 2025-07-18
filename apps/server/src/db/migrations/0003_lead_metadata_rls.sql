-- Enable RLS on the lead_metadata table
ALTER TABLE public.lead_metadata ENABLE ROW LEVEL SECURITY;

-- SELECT: Allow all authenticated users to view lead_metadata
CREATE POLICY "Allow authenticated read access"
ON public.lead_metadata
FOR SELECT
TO authenticated
USING (true);

-- INSERT: Allow authenticated users to insert
CREATE POLICY "Allow authenticated insert"
ON public.lead_metadata
FOR INSERT
TO authenticated
WITH CHECK (true);

-- UPDATE: Allow only admins to update
CREATE POLICY "Allow admin update"
ON public.lead_metadata
FOR UPDATE
TO authenticated
USING ((SELECT (auth.jwt() ->> 'user_role')::public.app_role) = 'admin');

-- DELETE: Allow only admins to delete
CREATE POLICY "Allow admin delete"
ON public.lead_metadata
FOR DELETE
TO authenticated
USING ((SELECT (auth.jwt() ->> 'user_role')::public.app_role) = 'admin'); 