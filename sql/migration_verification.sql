-- Migration: Add Verification & Trust System to Creators

-- 1. Add verification fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'unverified';
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_proof_urls TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_feedback TEXT;

-- 2. Add validation constraint for verification_status
ALTER TABLE users DROP CONSTRAINT IF EXISTS check_verification_status;
ALTER TABLE users ADD CONSTRAINT check_verification_status CHECK (
    verification_status IN ('unverified', 'pending_review', 'verified', 'rejected', 'flagged')
);

-- 3. Update the role constraint to allow 'admin'
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (
    role IN ('organizer', 'sponsor', 'creator', 'admin')
);
