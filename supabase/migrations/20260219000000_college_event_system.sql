/*
  # College Event Management System - Full Schema Extension

  Extends the existing event registration system with:
  - Departments
  - Role-based profiles (Admin, Coordinator, Participant)
  - Coordinator event assignments
  - Registration members (team details)
  - Audit logging
  - Payment screenshot storage
  - Registration slip support
*/

-- ============================================================
-- 1. Profiles table (must exist before helper functions)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text DEFAULT '',
  role text NOT NULL DEFAULT 'participant' CHECK (role IN ('admin', 'coordinator', 'participant')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- ============================================================
-- 2. Helper functions (SECURITY DEFINER to avoid RLS recursion)
-- ============================================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_coordinator()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coordinator'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Now enable RLS + policies for profiles (after helper functions exist)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT TO authenticated USING (id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
CREATE POLICY "Admins can insert profiles"
  ON profiles FOR INSERT TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR is_admin())
  WITH CHECK (id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;
CREATE POLICY "Admins can delete profiles"
  ON profiles FOR DELETE TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "Service can insert profiles" ON profiles;
CREATE POLICY "Service can insert profiles"
  ON profiles FOR INSERT TO service_role WITH CHECK (true);

-- Allow the trigger to bypass RLS when creating profiles
DROP POLICY IF EXISTS "Trigger can insert profiles" ON profiles;
CREATE POLICY "Trigger can insert profiles"
  ON profiles FOR INSERT TO postgres WITH CHECK (true);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'participant')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- 3. Departments table
-- ============================================================
CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  description text DEFAULT '',
  image_url text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view departments" ON departments;
CREATE POLICY "Anyone can view departments"
  ON departments FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Admins can insert departments" ON departments;
CREATE POLICY "Admins can insert departments"
  ON departments FOR INSERT TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can update departments" ON departments;
CREATE POLICY "Admins can update departments"
  ON departments FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can delete departments" ON departments;
CREATE POLICY "Admins can delete departments"
  ON departments FOR DELETE TO authenticated USING (is_admin());

CREATE INDEX IF NOT EXISTS idx_departments_code ON departments(code);

-- Seed 8 departments
INSERT INTO departments (name, code, description) VALUES
  ('Information Technology', 'IT', 'Department of Information Technology'),
  ('Computer Engineering', 'CE', 'Department of Computer Engineering'),
  ('Bio-Technology', 'BT', 'Department of Bio-Technology'),
  ('Electronics & Communication', 'EC', 'Department of Electronics & Communication'),
  ('Mechanical Engineering', 'ME', 'Department of Mechanical Engineering'),
  ('Civil Engineering', 'CV', 'Department of Civil Engineering'),
  ('Electrical Engineering', 'EE', 'Department of Electrical Engineering'),
  ('Chemical Engineering', 'CH', 'Department of Chemical Engineering')
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 4. Extend events table
-- ============================================================
ALTER TABLE events ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES departments(id) ON DELETE SET NULL;
ALTER TABLE events ADD COLUMN IF NOT EXISTS registration_fee numeric DEFAULT 0;
ALTER TABLE events ADD COLUMN IF NOT EXISTS max_team_size integer DEFAULT 10;
ALTER TABLE events ADD COLUMN IF NOT EXISTS allow_group boolean DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS qr_code_url text DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS upi_id text DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS payment_instructions text DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_events_department ON events(department_id);

-- Update events SELECT policy: anon sees active, authenticated sees all
DROP POLICY IF EXISTS "Anyone can view active events" ON events;
DROP POLICY IF EXISTS "Anon can view active events" ON events;
CREATE POLICY "Anon can view active events"
  ON events FOR SELECT TO anon USING (status IN ('upcoming', 'ongoing'));
DROP POLICY IF EXISTS "Authenticated can view all events" ON events;
CREATE POLICY "Authenticated can view all events"
  ON events FOR SELECT TO authenticated USING (true);

-- ============================================================
-- 5. Coordinator assignments
-- ============================================================
CREATE TABLE IF NOT EXISTS coordinator_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coordinator_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(coordinator_id, event_id)
);

ALTER TABLE coordinator_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Coordinators can view own assignments" ON coordinator_assignments;
CREATE POLICY "Coordinators can view own assignments"
  ON coordinator_assignments FOR SELECT TO authenticated
  USING (coordinator_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "Admins can manage assignments" ON coordinator_assignments;
CREATE POLICY "Admins can manage assignments"
  ON coordinator_assignments FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE INDEX IF NOT EXISTS idx_coord_assign_coordinator ON coordinator_assignments(coordinator_id);
CREATE INDEX IF NOT EXISTS idx_coord_assign_event ON coordinator_assignments(event_id);

-- ============================================================
-- 6. Registration members table
-- ============================================================
CREATE TABLE IF NOT EXISTS registration_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  member_name text NOT NULL,
  email text DEFAULT '',
  phone text DEFAULT '',
  college_id text DEFAULT '',
  member_order integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE registration_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert registration members" ON registration_members;
CREATE POLICY "Anyone can insert registration members"
  ON registration_members FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can view registration members" ON registration_members;
CREATE POLICY "Authenticated can view registration members"
  ON registration_members FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anon can view registration members" ON registration_members;
CREATE POLICY "Anon can view registration members"
  ON registration_members FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Authenticated can delete registration members" ON registration_members;
CREATE POLICY "Authenticated can delete registration members"
  ON registration_members FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_reg_members_registration ON registration_members(registration_id);

-- ============================================================
-- 7. Extend registrations table
-- ============================================================
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS rejection_reason text DEFAULT '';
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS reviewed_by uuid;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS payment_screenshot_url text DEFAULT '';
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS transaction_reference text DEFAULT '';
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS team_name text DEFAULT '';
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS college_id text DEFAULT '';

-- Update status constraint to include 'rejected'
DO $$
BEGIN
  ALTER TABLE registrations DROP CONSTRAINT IF EXISTS registrations_status_check;
  ALTER TABLE registrations ADD CONSTRAINT registrations_status_check
    CHECK (status IN ('pending', 'confirmed', 'cancelled', 'attended', 'rejected'));
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Update registration_type constraint to include 'group'
DO $$
BEGIN
  ALTER TABLE registrations DROP CONSTRAINT IF EXISTS registration_type_check;
  ALTER TABLE registrations ADD CONSTRAINT registration_type_check
    CHECK (registration_type IN ('solo', 'duo', 'trio', 'quad', 'group'));
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- ============================================================
-- 8. Audit log
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid REFERENCES registrations(id) ON DELETE SET NULL,
  action text NOT NULL,
  performed_by uuid,
  reason text DEFAULT '',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view audit log" ON audit_log;
CREATE POLICY "Authenticated can view audit log"
  ON audit_log FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can insert audit log" ON audit_log;
CREATE POLICY "Authenticated can insert audit log"
  ON audit_log FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_audit_log_registration ON audit_log(registration_id);

-- ============================================================
-- 9. Updated registration ID generation with department code
-- ============================================================
CREATE OR REPLACE FUNCTION generate_registration_id(dept_code text DEFAULT 'GEN')
RETURNS TEXT AS $$
DECLARE
  new_id TEXT;
  id_exists BOOLEAN;
  year_str TEXT;
  seq_num INTEGER;
BEGIN
  year_str := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
  LOOP
    seq_num := floor(random() * 900000 + 100000)::INTEGER;
    new_id := 'EVT-' || UPPER(dept_code) || '-' || year_str || '-' || LPAD(seq_num::TEXT, 6, '0');
    SELECT EXISTS(SELECT 1 FROM registrations WHERE registration_id = new_id) INTO id_exists;
    IF NOT id_exists THEN
      EXIT;
    END IF;
  END LOOP;
  RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 10. Auto-increment / decrement attendees via triggers
-- ============================================================
CREATE OR REPLACE FUNCTION increment_attendees()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE events SET current_attendees = current_attendees + 1 WHERE id = NEW.event_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_attendees()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE events SET current_attendees = GREATEST(0, current_attendees - 1) WHERE id = OLD.event_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_registration_insert ON registrations;
CREATE TRIGGER on_registration_insert
  AFTER INSERT ON registrations
  FOR EACH ROW
  EXECUTE FUNCTION increment_attendees();

DROP TRIGGER IF EXISTS on_registration_delete ON registrations;
CREATE TRIGGER on_registration_delete
  AFTER DELETE ON registrations
  FOR EACH ROW
  EXECUTE FUNCTION decrement_attendees();

-- ============================================================
-- 11. RPC functions for public status tracking
-- ============================================================
CREATE OR REPLACE FUNCTION track_registration(reg_id text)
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'registration_id', r.registration_id,
    'name', r.name,
    'email', r.email,
    'status', r.status,
    'registration_type', r.registration_type,
    'team_name', r.team_name,
    'event_title', e.title,
    'event_date', e.event_date,
    'event_time', e.event_time,
    'event_location', e.location,
    'department_name', d.name,
    'department_code', d.code,
    'rejection_reason', r.rejection_reason,
    'registered_at', r.registered_at,
    'reviewed_at', r.reviewed_at
  ) INTO result
  FROM registrations r
  JOIN events e ON e.id = r.event_id
  LEFT JOIN departments d ON d.id = e.department_id
  WHERE r.registration_id = UPPER(reg_id);

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_registration_slip(reg_id text)
RETURNS json AS $$
DECLARE
  result json;
  reg_uuid uuid;
  reg_status text;
BEGIN
  SELECT id, status INTO reg_uuid, reg_status
  FROM registrations WHERE registration_id = UPPER(reg_id);

  IF reg_status != 'confirmed' THEN
    RETURN NULL;
  END IF;

  SELECT json_build_object(
    'registration_id', r.registration_id,
    'name', r.name,
    'email', r.email,
    'phone', r.phone,
    'college_id', r.college_id,
    'team_name', r.team_name,
    'registration_type', r.registration_type,
    'registration_fee', e.registration_fee,
    'status', r.status,
    'registered_at', r.registered_at,
    'reviewed_at', r.reviewed_at,
    'event_title', e.title,
    'event_date', e.event_date,
    'event_time', e.event_time,
    'event_location', e.location,
    'department_name', d.name,
    'department_code', d.code,
    'members', (
      SELECT COALESCE(json_agg(json_build_object(
        'member_name', rm.member_name,
        'email', rm.email,
        'phone', rm.phone,
        'college_id', rm.college_id,
        'member_order', rm.member_order
      ) ORDER BY rm.member_order), '[]'::json)
      FROM registration_members rm
      WHERE rm.registration_id = r.id
    )
  ) INTO result
  FROM registrations r
  JOIN events e ON e.id = r.event_id
  LEFT JOIN departments d ON d.id = e.department_id
  WHERE r.registration_id = UPPER(reg_id);

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 12. Storage bucket for payment screenshots
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('payment-screenshots', 'payment-screenshots', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Anyone can upload payment screenshots" ON storage.objects;
CREATE POLICY "Anyone can upload payment screenshots"
  ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'payment-screenshots');

DROP POLICY IF EXISTS "Authenticated can view payment screenshots" ON storage.objects;
CREATE POLICY "Authenticated can view payment screenshots"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'payment-screenshots');

-- ============================================================
-- 13. Coordinator helper function
-- ============================================================
CREATE OR REPLACE FUNCTION get_coordinator_event_ids(coordinator_uuid uuid)
RETURNS SETOF uuid AS $$
  SELECT event_id FROM coordinator_assignments WHERE coordinator_id = coordinator_uuid;
$$ LANGUAGE sql SECURITY DEFINER;
