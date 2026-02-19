-- Add registration type columns to events table
ALTER TABLE events 
ADD COLUMN allow_single boolean DEFAULT true,
ADD COLUMN allow_double boolean DEFAULT false,
ADD COLUMN allow_triple boolean DEFAULT false,
ADD COLUMN allow_quad boolean DEFAULT false;

-- Update existing records to reflect default values if necessary (though DEFAULT handles it)
COMMENT ON COLUMN events.allow_single IS 'Allows single person registration';
COMMENT ON COLUMN events.allow_double IS 'Allows team of 2 registration';
COMMENT ON COLUMN events.allow_triple IS 'Allows team of 3 registration';
COMMENT ON COLUMN events.allow_quad IS 'Allows team of 4 registration';
