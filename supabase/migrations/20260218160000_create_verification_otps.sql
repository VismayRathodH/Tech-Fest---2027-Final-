-- Migration: Create verification_otps table for real-time verification
-- This table stores temporary codes for email and mobile verification.

CREATE TABLE IF NOT EXISTS verification_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_info text NOT NULL, -- email or phone
  code text NOT NULL,        -- 6 digit code
  type text NOT NULL CHECK (type IN ('email', 'phone')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE verification_otps ENABLE ROW LEVEL SECURITY;

-- Only service role (Edge Functions) should manage this table
CREATE POLICY "Service role only" 
ON verification_otps
TO service_role
USING (true)
WITH CHECK (true);

-- Index for fast lookup and cleanup
CREATE INDEX IF NOT EXISTS idx_verification_contact ON verification_otps(contact_info);

-- Optional: Function to cleanup expired OTPs
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void AS $$
BEGIN
  DELETE FROM verification_otps WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;
