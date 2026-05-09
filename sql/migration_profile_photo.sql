-- Add profile photo columns for sponsors (and any user role that may need them)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS profile_photo TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS profile_photo_file_id TEXT;

-- Ensure brand logo columns exist (they may have been added outside migrations)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS organization_logo TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS logo_file_id TEXT;
