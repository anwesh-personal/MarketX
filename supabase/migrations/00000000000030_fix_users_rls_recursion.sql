-- ============================================================
-- Fix infinite recursion in users RLS policy
--
-- The existing policy "Users see org users" queries the users
-- table inside a policy ON the users table → infinite recursion.
--
-- Fix: SECURITY DEFINER function runs as the function owner
-- (superuser), bypassing RLS for just the org_id lookup.
-- This is the standard Supabase pattern for self-referencing policies.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_user_org_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT org_id FROM public.users WHERE id = auth.uid()
$$;

DROP POLICY IF EXISTS "Users see org users" ON users;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Users see org users'
    ) THEN
        CREATE POLICY "Users see org users" ON users
            FOR SELECT
            USING (org_id = public.get_user_org_id());
    END IF;
END
$$;
