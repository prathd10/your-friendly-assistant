-- Consolidated Super-Fix for Role Constraints and Missing Columns
-- Run this in your Supabase SQL Editor to resolve "Database error saving new user"

-- 1. Ensure all required columns exist in public.users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'unverified';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS verification_proof_urls TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS verification_feedback TEXT;

-- 2. Update Constraints for Roles and Verification Status
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('organizer', 'sponsor', 'creator', 'admin', 'performer', 'vendor'));

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS check_verification_status;
ALTER TABLE public.users ADD CONSTRAINT check_verification_status 
  CHECK (verification_status IN ('unverified', 'pending_review', 'verified', 'rejected', 'flagged'));

-- 3. Robust Trigger Function to sync Auth Metadata with Public Profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (
    id, 
    email, 
    role, 
    full_name, 
    organization_name, 
    city,
    phone,
    website_url,
    verification_status
  )
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'role', 'organizer'),
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    COALESCE(new.raw_user_meta_data->>'organization_name', ''),
    COALESCE(new.raw_user_meta_data->>'city', ''),
    COALESCE(new.raw_user_meta_data->>'phone', ''),
    COALESCE(new.raw_user_meta_data->>'website_url', ''),
    'unverified'
  );
  RETURN new;
END;
$$;

-- 4. Ensure Trigger is correctly linked
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
