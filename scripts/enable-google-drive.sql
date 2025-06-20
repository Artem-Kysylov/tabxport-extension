-- Enable Google Drive for all users
-- Run this in Supabase SQL Editor

-- First, let's see current user profiles
SELECT 
  id, 
  full_name, 
  email,
  google_drive_enabled,
  plan_type,
  created_at
FROM user_profiles 
ORDER BY created_at DESC;

-- Enable Google Drive for all users
UPDATE user_profiles 
SET google_drive_enabled = true
WHERE google_drive_enabled = false;

-- Update Google Drive quota for users with 0 limit
UPDATE usage_quotas 
SET google_drive_limit = 5  -- Set reasonable limit for free users
WHERE google_drive_limit = 0;

-- Check results
SELECT 
  p.full_name,
  p.google_drive_enabled,
  q.google_drive_used,
  q.google_drive_limit
FROM user_profiles p
JOIN usage_quotas q ON p.id = q.user_id
ORDER BY p.created_at DESC; 