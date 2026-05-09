-- Create RSVPs table
CREATE TABLE IF NOT EXISTS public.rsvps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.rsvps ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (for guest users to RSVP)
CREATE POLICY "Allow anonymous inserts to rsvps" ON public.rsvps
    FOR INSERT WITH CHECK (true);

-- Allow organizers to view RSVPs for their own events
CREATE POLICY "Allow organizers to view RSVPs for their events" ON public.rsvps
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.events
            WHERE events.id = rsvps.event_id
            AND events.organizer_id = auth.uid()
        )
    );
