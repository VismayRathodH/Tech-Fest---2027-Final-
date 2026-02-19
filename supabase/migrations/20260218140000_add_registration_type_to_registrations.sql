-- Add registration type and team members to registrations table
ALTER TABLE registrations 
ADD COLUMN registration_type text DEFAULT 'solo',
ADD COLUMN team_members jsonb DEFAULT '[]'::jsonb;

-- Add check constraint for registration_type
ALTER TABLE registrations
ADD CONSTRAINT registration_type_check 
CHECK (registration_type IN ('solo', 'duo', 'trio', 'quad'));

COMMENT ON COLUMN registrations.registration_type IS 'Type of registration (solo, duo, trio, quad)';
COMMENT ON COLUMN registrations.team_members IS 'Names of additional team members (JSON array)';
