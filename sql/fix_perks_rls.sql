-- Ensure is_public column exists (already done, but safe)
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;

-- Ensure event_perks table exists and has correct policies
-- Drop old policies to avoid conflicts
DROP POLICY IF EXISTS "Anyone can view active perks" ON public.event_perks;

-- Re-create policy with explicit 'anon' access
CREATE POLICY "Allow public to view active perks" ON public.event_perks
    FOR SELECT USING (is_active = true);

-- Also ensure the organizer policy is correct
DROP POLICY IF EXISTS "Organizers can manage their event perks" ON public.event_perks;
CREATE POLICY "Organizers can manage their event perks" ON public.event_perks
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.events
            WHERE events.id = event_perks.event_id
            AND events.organizer_id = auth.uid()
        )
    );
