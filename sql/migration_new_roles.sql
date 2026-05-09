-- Add performer and vendor roles to the users table
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('organizer', 'sponsor', 'creator', 'admin', 'performer', 'vendor'));

-- Update connection requests to support new roles
ALTER TABLE public.connection_requests DROP CONSTRAINT IF EXISTS connection_requests_request_type_check;
ALTER TABLE public.connection_requests ADD CONSTRAINT connection_requests_request_type_check 
  CHECK (request_type IN (
    'sponsor_to_organizer', 
    'organizer_to_sponsor', 
    'organizer_to_creator', 
    'sponsor_to_creator',
    'organizer_to_performer',
    'organizer_to_vendor'
  ));
