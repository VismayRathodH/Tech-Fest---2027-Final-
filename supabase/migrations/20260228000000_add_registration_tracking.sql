-- Add tracking columns to registrations table
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS ip_address text;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS user_agent text;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS browser_info jsonb DEFAULT '{}'::jsonb;

-- Comment on columns for documentation
COMMENT ON COLUMN registrations.ip_address IS 'IP address of the registrant (captured via client-side or proxy headers)';
COMMENT ON COLUMN registrations.user_agent IS 'Browser user agent string of the registrant';
COMMENT ON COLUMN registrations.browser_info IS 'Parsed browser/OS information and other client-side metadata';
