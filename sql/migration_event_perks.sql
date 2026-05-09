-- Create Event Perks table
CREATE TABLE IF NOT EXISTS public.event_perks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    code TEXT, -- Discount code or link
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.event_perks ENABLE ROW LEVEL SECURITY;

-- Anyone can view perks (needed for landing page success message)
CREATE POLICY "Anyone can view active perks" ON public.event_perks
    FOR SELECT USING (is_active = true);

-- Organizers can manage perks for their own events
CREATE POLICY "Organizers can manage their event perks" ON public.event_perks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.events
            WHERE events.id = event_perks.event_id
            AND events.organizer_id = auth.uid()
        )
    );
