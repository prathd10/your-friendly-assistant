-- Add is_public column to events table
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;

-- Update existing events to be public by default if they are active
UPDATE public.events SET is_public = true WHERE status = 'active';

-- Allow anonymous users to view active, public events
CREATE POLICY "Allow anonymous to view active public events" ON public.events
    FOR SELECT USING (status = 'active' AND is_public = true);

