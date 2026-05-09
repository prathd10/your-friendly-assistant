-- ============================================
-- EventSphere Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================

-- 1. Users (extended profile table)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('organizer', 'sponsor', 'creator', 'admin', 'performer', 'vendor')),
  full_name TEXT NOT NULL,
  email TEXT,
  organization_name TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT '',
  phone TEXT,
  website_url TEXT,
  verification_status TEXT DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'pending_review', 'verified', 'rejected', 'flagged')),
  verification_proof_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
  verification_feedback TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Events
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT DEFAULT '',
  city TEXT NOT NULL,
  state TEXT DEFAULT '',
  venue_name TEXT DEFAULT '',
  full_address TEXT DEFAULT '',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  budget_required INTEGER NOT NULL DEFAULT 0,
  audience_size INTEGER NOT NULL DEFAULT 0,
  expected_footfall INTEGER NOT NULL DEFAULT 0,
  previous_year_footfall INTEGER,
  target_demographics TEXT DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  event_date DATE NOT NULL,
  event_end_date DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed')),
  pitch_deck_url TEXT,
  website_url TEXT,
  social_media_reach INTEGER,
  event_lineup TEXT DEFAULT '',
  past_sponsors TEXT,
  sponsorship_tiers TEXT,
  usp TEXT,
  media_coverage TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Storage bucket for pitch decks
INSERT INTO storage.buckets (id, name, public) VALUES ('pitch-decks', 'pitch-decks', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: authenticated users can upload pitch decks
CREATE POLICY "Users can upload pitch decks" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'pitch-decks' AND auth.uid() IS NOT NULL);
CREATE POLICY "Anyone can view pitch decks" ON storage.objects
  FOR SELECT USING (bucket_id = 'pitch-decks');

-- 3. Matches
CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  sponsor_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  match_score INTEGER NOT NULL DEFAULT 0,
  reason TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Conversations
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  organizer_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  sponsor_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, organizer_id, sponsor_id)
);

-- 5. Messages
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT TO authenticated USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE TO authenticated USING (id = auth.uid());

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- Allow users to view other users (for messaging/matching context)
CREATE POLICY "Users can view other profiles" ON public.users
  FOR SELECT TO authenticated USING (true);

-- Events policies
CREATE POLICY "Anyone can view active events" ON public.events
  FOR SELECT TO authenticated USING (status = 'active' OR organizer_id = auth.uid());

CREATE POLICY "Organizers can create events" ON public.events
  FOR INSERT TO authenticated
  WITH CHECK (organizer_id = auth.uid());

CREATE POLICY "Organizers can update own events" ON public.events
  FOR UPDATE TO authenticated
  USING (organizer_id = auth.uid());

CREATE POLICY "Organizers can delete own events" ON public.events
  FOR DELETE TO authenticated
  USING (organizer_id = auth.uid());

-- Matches policies
CREATE POLICY "Users can view own matches" ON public.matches
  FOR SELECT TO authenticated
  USING (
    sponsor_id = auth.uid()
    OR event_id IN (SELECT id FROM public.events WHERE organizer_id = auth.uid())
  );

-- Matches insert by DB function (security definer)
CREATE POLICY "System can insert matches" ON public.matches
  FOR INSERT TO authenticated WITH CHECK (true);

-- Conversations policies
CREATE POLICY "Users can view own conversations" ON public.conversations
  FOR SELECT TO authenticated
  USING (organizer_id = auth.uid() OR sponsor_id = auth.uid());

CREATE POLICY "Users can create conversations" ON public.conversations
  FOR INSERT TO authenticated
  WITH CHECK (organizer_id = auth.uid() OR sponsor_id = auth.uid());

-- Messages policies
CREATE POLICY "Users can view own messages" ON public.messages
  FOR SELECT TO authenticated
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Users can send messages" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid());

-- ============================================
-- TRIGGER: Auto-create user profile on signup
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, role, full_name, organization_name, city, phone, website_url, verification_status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'organizer'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'organization_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'city', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'website_url', ''),
    'unverified'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- MATCHING ENGINE (PostgreSQL Function)
-- Scoring:
--   40% category match
--   25% budget compatibility
--   20% location proximity (Haversine)
--   10% audience size compatibility
--   5% tags similarity
-- Only creates match if score > 60
-- ============================================

CREATE OR REPLACE FUNCTION public.haversine_km(
  lat1 DOUBLE PRECISION, lon1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION, lon2 DOUBLE PRECISION
) RETURNS DOUBLE PRECISION AS $$
DECLARE
  R CONSTANT DOUBLE PRECISION := 6371;
  dlat DOUBLE PRECISION;
  dlon DOUBLE PRECISION;
  a DOUBLE PRECISION;
BEGIN
  IF lat1 IS NULL OR lon1 IS NULL OR lat2 IS NULL OR lon2 IS NULL THEN
    RETURN NULL;
  END IF;
  dlat := RADIANS(lat2 - lat1);
  dlon := RADIANS(lon2 - lon1);
  a := SIN(dlat / 2) ^ 2 + COS(RADIANS(lat1)) * COS(RADIANS(lat2)) * SIN(dlon / 2) ^ 2;
  RETURN R * 2 * ASIN(SQRT(a));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.calculate_matches(p_event_id UUID)
RETURNS VOID AS $$
DECLARE
  v_event RECORD;
  v_sponsor RECORD;
  v_score INTEGER;
  v_reason TEXT;
  v_cat_score INTEGER;
  v_budget_score INTEGER;
  v_loc_score INTEGER;
  v_aud_score INTEGER;
  v_tag_score INTEGER;
  v_distance DOUBLE PRECISION;
  v_sponsor_cats TEXT[];
  v_sponsor_budget INTEGER;
  v_common_tags INTEGER;
  v_total_tags INTEGER;
BEGIN
  SELECT * INTO v_event FROM public.events WHERE id = p_event_id;
  IF NOT FOUND THEN RETURN; END IF;

  -- Delete existing matches for this event
  DELETE FROM public.matches WHERE event_id = p_event_id;

  FOR v_sponsor IN
    SELECT * FROM public.users WHERE role = 'sponsor'
  LOOP
    v_score := 0;
    v_reason := '';

    -- Extract sponsor preferences
    v_sponsor_cats := ARRAY(
      SELECT jsonb_array_elements_text(COALESCE(v_sponsor.preferences->'categories', '[]'::jsonb))
    );
    v_sponsor_budget := COALESCE((v_sponsor.preferences->>'max_budget')::INTEGER, 0);

    -- 1. Category match (40%)
    IF v_event.category = ANY(v_sponsor_cats) THEN
      v_cat_score := 40;
      v_reason := v_reason || 'Category match (' || v_event.category || '). ';
    ELSE
      v_cat_score := 0;
    END IF;

    -- 2. Budget compatibility (25%)
    IF v_sponsor_budget >= v_event.budget_required THEN
      v_budget_score := 25;
      v_reason := v_reason || 'Budget compatible. ';
    ELSIF v_sponsor_budget > 0 THEN
      v_budget_score := GREATEST(0, 25 - ((v_event.budget_required - v_sponsor_budget) * 25 / GREATEST(v_event.budget_required, 1)));
      IF v_budget_score > 10 THEN
        v_reason := v_reason || 'Partial budget match. ';
      END IF;
    ELSE
      v_budget_score := 12; -- neutral if no budget info
    END IF;

    -- 3. Location proximity (20%)
    v_distance := public.haversine_km(
      v_event.latitude, v_event.longitude,
      v_sponsor.latitude, v_sponsor.longitude
    );
    IF v_distance IS NULL THEN
      -- Check city match instead
      IF v_sponsor.city ILIKE '%' || v_event.city || '%' OR v_event.city ILIKE '%' || v_sponsor.city || '%' THEN
        v_loc_score := 20;
        v_reason := v_reason || 'Same city (' || v_event.city || '). ';
      ELSE
        v_loc_score := 5;
      END IF;
    ELSIF v_distance <= 50 THEN
      v_loc_score := 20;
      v_reason := v_reason || 'Within 50km. ';
    ELSIF v_distance <= 100 THEN
      v_loc_score := 14;
      v_reason := v_reason || 'Within 100km. ';
    ELSIF v_distance <= 300 THEN
      v_loc_score := 8;
    ELSE
      v_loc_score := 2;
    END IF;

    -- 4. Audience size (10%)
    v_aud_score := CASE
      WHEN v_event.audience_size >= 2000 THEN 10
      WHEN v_event.audience_size >= 1000 THEN 8
      WHEN v_event.audience_size >= 500 THEN 6
      ELSE 4
    END;
    IF v_aud_score >= 8 THEN
      v_reason := v_reason || 'Good audience reach (' || v_event.audience_size || '). ';
    END IF;

    -- 5. Tags similarity (5%)
    IF array_length(v_event.tags, 1) IS NOT NULL AND array_length(v_sponsor_cats, 1) IS NOT NULL THEN
      SELECT COUNT(*) INTO v_common_tags
      FROM unnest(v_event.tags) t
      WHERE LOWER(t) = ANY(SELECT LOWER(c) FROM unnest(v_sponsor_cats) c);
      v_total_tags := GREATEST(array_length(v_event.tags, 1), 1);
      v_tag_score := LEAST(5, (v_common_tags * 5) / v_total_tags);
    ELSE
      v_tag_score := 0;
    END IF;

    v_score := v_cat_score + v_budget_score + v_loc_score + v_aud_score + v_tag_score;

    IF v_score > 60 THEN
      INSERT INTO public.matches (event_id, sponsor_id, match_score, reason)
      VALUES (p_event_id, v_sponsor.id, v_score, v_reason);
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ENABLE REALTIME for messages
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- ============================================
-- SEED DATA (Demo Mode)
-- Run this AFTER creating test auth users
-- ============================================

-- NOTE: To seed demo data, first create these users via Supabase Auth:
--
-- Organizer accounts (email/password):
--   org1@eventsphere.demo / demo123456
--   org2@eventsphere.demo / demo123456
--   org3@eventsphere.demo / demo123456
--
-- Sponsor accounts (email/password):
--   sponsor1@eventsphere.demo / demo123456
--   sponsor2@eventsphere.demo / demo123456
--   sponsor3@eventsphere.demo / demo123456
--   sponsor4@eventsphere.demo / demo123456
--
-- Then update the UUIDs below with the actual auth.users IDs
-- and run the INSERT statements.
--
-- Alternatively, just sign up through the app UI to create real accounts!
