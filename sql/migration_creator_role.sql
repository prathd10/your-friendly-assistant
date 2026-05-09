-- 1. Updates to the users table for Creator role
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('organizer', 'sponsor', 'creator'));

ALTER TABLE public.users ADD COLUMN platform TEXT;
ALTER TABLE public.users ADD COLUMN niche TEXT;
ALTER TABLE public.users ADD COLUMN followers_count INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN engagement_rate DOUBLE PRECISION DEFAULT 0.0;
ALTER TABLE public.users ADD COLUMN average_views INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN audience_demographics TEXT;
ALTER TABLE public.users ADD COLUMN pricing_per_post INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN media_kit_url TEXT;
ALTER TABLE public.users ADD COLUMN portfolio_urls TEXT[] DEFAULT '{}';

-- 2. Update Connection Requests for Campaigns
ALTER TABLE public.connection_requests DROP CONSTRAINT IF EXISTS connection_requests_request_type_check;
ALTER TABLE public.connection_requests ADD CONSTRAINT connection_requests_request_type_check 
  CHECK (request_type IN ('sponsor_to_organizer', 'organizer_to_sponsor', 'organizer_to_creator', 'sponsor_to_creator'));

ALTER TABLE public.connection_requests ADD COLUMN campaign_details JSONB;

-- 3. Storage bucket for Creator Media Kits
INSERT INTO storage.buckets (id, name, public) 
VALUES ('creator-media', 'creator-media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload creator media" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'creator-media' AND auth.uid() IS NOT NULL);
CREATE POLICY "Anyone can view creator media" ON storage.objects
  FOR SELECT USING (bucket_id = 'creator-media');
