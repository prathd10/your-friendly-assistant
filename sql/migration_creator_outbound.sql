-- Add creator_to_organizer and creator_to_sponsor to the request_type constraint.
-- Run this in Supabase SQL Editor.

ALTER TABLE connection_requests DROP CONSTRAINT IF EXISTS connection_requests_request_type_check;

ALTER TABLE connection_requests ADD CONSTRAINT connection_requests_request_type_check CHECK (
    request_type IN (
        'sponsor_to_organizer',
        'organizer_to_sponsor',
        'organizer_to_creator',
        'sponsor_to_creator',
        'creator_to_organizer',
        'creator_to_sponsor'
    )
);
