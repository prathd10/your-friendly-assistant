-- 1. Create a new storage bucket for event media
INSERT INTO storage.buckets (id, name, public) 
VALUES ('event-media', 'event-media', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Storage policy: authenticated users can upload event media
CREATE POLICY "Users can upload event media" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'event-media' AND auth.uid() IS NOT NULL);
CREATE POLICY "Anyone can view event media" ON storage.objects
  FOR SELECT USING (bucket_id = 'event-media');

-- 3. Add the missing event columns for media and storage
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS past_event_media TEXT[] DEFAULT '{}';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS past_media_details JSONB DEFAULT '[]';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS pitch_deck_file_id TEXT;
