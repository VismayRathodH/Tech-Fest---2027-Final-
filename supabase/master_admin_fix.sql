-- 1. Update Profile Roles Check Constraint
-- This allows the 'master_admin' role to be stored in the database.
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('master_admin', 'admin', 'coordinator', 'participant'));

-- 2. Update is_admin() helper function
-- This ensures that Master Admins have all the permissions and access that regular Admins have.
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'master_admin')
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 3. Add manual_adjustment column to departments table
-- This stores the manual revenue overrides for each department.
ALTER TABLE departments ADD COLUMN IF NOT EXISTS manual_adjustment numeric DEFAULT 0;
