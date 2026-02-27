-- ============================================
-- Migration: Connection Requests + Sponsor Business Details
-- Run this in your Supabase SQL Editor
-- ============================================

-- 1. Add business_description to users table for sponsor profiles
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS business_description TEXT DEFAULT '';

-- 2. Add sponsor_deliverables column to events if not exists
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS sponsor_deliverables TEXT;

-- 3. Connection Requests table
CREATE TABLE IF NOT EXISTS public.connection_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL CHECK (request_type IN ('sponsor_to_organizer', 'organizer_to_sponsor')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  message TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.connection_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own requests" ON public.connection_requests
  FOR SELECT TO authenticated
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Users can create requests" ON public.connection_requests
  FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can update requests sent to them" ON public.connection_requests
  FOR UPDATE TO authenticated
  USING (receiver_id = auth.uid());

-- Enable realtime for connection_requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.connection_requests;
