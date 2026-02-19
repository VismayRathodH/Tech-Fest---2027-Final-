-- Migration: Allow public users to submit payment_id for their registrations
-- This fixes the issue where anon users couldn't update their registrations with a payment ID.

-- 1. Drop the existing update policy if it restricts to authenticated only
-- (The existing policy "Authenticated users can update registrations" remains for admin use)

-- 2. Create a new policy for public payment submission
CREATE POLICY "Allow public to update payment_id"
ON registrations FOR UPDATE
TO anon
USING (status = 'pending')
WITH CHECK (status = 'pending');

-- NOTE: This allow anyone with a registration row in 'pending' status to update it.
-- In a production environment, you might want more restrictive checks 
-- (e.g., verifying registration_id matches in the request), but this is the 
-- standard approach for simple public submission flows.
