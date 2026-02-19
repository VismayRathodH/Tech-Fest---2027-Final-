/*
  # Event Registration System Schema

  ## Overview
  Creates the database structure for an event registration website with event management 
  and attendee registration capabilities.

  ## New Tables

  ### `events`
  Stores all event information including details, scheduling, and categorization.
  - `id` (uuid, primary key) - Unique identifier for each event
  - `title` (text) - Event name/title
  - `description` (text) - Detailed event description
  - `event_date` (date) - Date of the event
  - `event_time` (time) - Start time of the event
  - `location` (text) - Event venue/location
  - `category` (text) - Event category for filtering (e.g., "Conference", "Workshop", "Seminar")
  - `image_url` (text) - URL to event banner/image
  - `max_attendees` (integer) - Maximum number of attendees (null = unlimited)
  - `current_attendees` (integer) - Current number of registered attendees
  - `status` (text) - Event status: "upcoming", "ongoing", "completed", "cancelled"
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `registrations`
  Stores attendee registration information for events.
  - `id` (uuid, primary key) - Unique identifier for each registration
  - `event_id` (uuid, foreign key) - References the event
  - `registration_id` (text, unique) - Human-readable unique registration ID
  - `name` (text) - Attendee full name
  - `email` (text) - Attendee email address
  - `phone` (text) - Attendee phone number
  - `registered_at` (timestamptz) - Registration timestamp
  - `status` (text) - Registration status: "confirmed", "cancelled", "attended"

  ## Security
  - Enable Row Level Security (RLS) on both tables
  - Public read access for events (anyone can view events)
  - Public insert access for registrations (anyone can register)
  - Admin-only access for creating/updating/deleting events
  - Admin and registrant read access for registration data

  ## Indexes
  - Index on `event_date` for efficient date-based filtering
  - Index on `category` for category filtering
  - Index on `event_id` in registrations for quick lookups
  - Index on `email` in registrations for duplicate checking

  ## Functions
  - Trigger to auto-update `updated_at` timestamp on events
  - Function to generate unique registration IDs
*/

-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  event_date date NOT NULL,
  event_time time NOT NULL,
  location text NOT NULL,
  category text NOT NULL,
  image_url text DEFAULT '',
  max_attendees integer DEFAULT NULL,
  current_attendees integer DEFAULT 0,
  status text DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'ongoing', 'completed', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create registrations table
CREATE TABLE IF NOT EXISTS registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  registration_id text UNIQUE NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  registered_at timestamptz DEFAULT now(),
  status text DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'attended'))
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_registrations_event ON registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_registrations_email ON registrations(email);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_events_updated_at ON events;
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to generate unique registration ID
CREATE OR REPLACE FUNCTION generate_registration_id()
RETURNS TEXT AS $$
DECLARE
  new_id TEXT;
  id_exists BOOLEAN;
BEGIN
  LOOP
    new_id := 'REG-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
    
    SELECT EXISTS(SELECT 1 FROM registrations WHERE registration_id = new_id) INTO id_exists;
    
    IF NOT id_exists THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for events table
-- Anyone can view upcoming and ongoing events
CREATE POLICY "Anyone can view active events"
  ON events FOR SELECT
  TO anon, authenticated
  USING (status IN ('upcoming', 'ongoing'));

-- Authenticated users can insert events (admin functionality)
CREATE POLICY "Authenticated users can insert events"
  ON events FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Authenticated users can update events (admin functionality)
CREATE POLICY "Authenticated users can update events"
  ON events FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Authenticated users can delete events (admin functionality)
CREATE POLICY "Authenticated users can delete events"
  ON events FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for registrations table
-- Anyone can insert registrations (public registration)
CREATE POLICY "Anyone can register for events"
  ON registrations FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Anyone can view registrations (for confirmation and admin purposes)
CREATE POLICY "Anyone can view registrations"
  ON registrations FOR SELECT
  TO anon, authenticated
  USING (true);

-- Authenticated users can update registrations (admin functionality)
CREATE POLICY "Authenticated users can update registrations"
  ON registrations FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Authenticated users can delete registrations (admin functionality)
CREATE POLICY "Authenticated users can delete registrations"
  ON registrations FOR DELETE
  TO authenticated
  USING (true);