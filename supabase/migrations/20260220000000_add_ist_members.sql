/*
  # IST Member Discount Table
  
  Stores enrollment numbers of IST (student club) members
  who are eligible for a ₹20 per-person discount.
  Admin can bulk-add enrollment numbers.
*/

-- IST Members table
CREATE TABLE IF NOT EXISTS ist_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_number text NOT NULL,
  student_name text DEFAULT '',
  added_at timestamptz DEFAULT now(),
  CONSTRAINT ist_members_enrollment_unique UNIQUE (enrollment_number)
);

CREATE INDEX IF NOT EXISTS idx_ist_enrollment ON ist_members(enrollment_number);

-- RLS
ALTER TABLE ist_members ENABLE ROW LEVEL SECURITY;

-- Everyone can read (needed for registration check)
DROP POLICY IF EXISTS "ist_members_select" ON ist_members;
CREATE POLICY "ist_members_select" ON ist_members FOR SELECT USING (true);

-- Only admins can insert/update/delete
DROP POLICY IF EXISTS "ist_members_insert" ON ist_members;
CREATE POLICY "ist_members_insert" ON ist_members FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "ist_members_update" ON ist_members;
CREATE POLICY "ist_members_update" ON ist_members FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "ist_members_delete" ON ist_members;
CREATE POLICY "ist_members_delete" ON ist_members FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
