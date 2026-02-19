-- Migration: Add payment and verification fields to registrations

-- 1. Add new columns
ALTER TABLE registrations 
ADD COLUMN IF NOT EXISTS payment_id text,
ADD COLUMN IF NOT EXISTS email_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS phone_verified boolean DEFAULT false;

-- 2. Update status check constraint
-- First drop the old constraint if we can identify it, or just add a new one if it's not named.
-- Based on the existing schema: status text DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'attended'))
-- We need to change 'confirmed' default to 'pending' and add 'pending' to the check.

ALTER TABLE registrations ALTER COLUMN status SET DEFAULT 'pending';

-- Note: In Supabase/PostgreSQL, you usually need to drop and recreate the constraint.
-- Finding the constraint name:
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'registrations' AND constraint_name = 'registrations_status_check') THEN
        ALTER TABLE registrations DROP CONSTRAINT registrations_status_check;
    END IF;
END $$;

-- This might vary depending on how Supabase named it automatically. 
-- A more robust way if name is unknown:
-- ALTER TABLE registrations DROP CONSTRAINT IF EXISTS registrations_status_key; -- No, it's a check constraint.

-- For safety in this environment, I'll provide the SQL to be run in the Supabase SQL Editor:
/*
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS payment_id text;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS email_verified boolean DEFAULT false;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS phone_verified boolean DEFAULT false;

-- Update status options
ALTER TABLE registrations DROP CONSTRAINT IF EXISTS registrations_status_check;
ALTER TABLE registrations ADD CONSTRAINT registrations_status_check CHECK (status IN ('pending', 'confirmed', 'cancelled', 'attended'));
ALTER TABLE registrations ALTER COLUMN status SET DEFAULT 'pending';
*/
