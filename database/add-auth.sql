-- ============================================================
-- ADD PASSWORD AUTHENTICATION
-- Run this in Supabase SQL Editor
-- ============================================================

-- Add password_hash to platform_admins
ALTER TABLE platform_admins 
ADD COLUMN password_hash VARCHAR(255);

-- Add password_hash to users
ALTER TABLE users 
ADD COLUMN password_hash VARCHAR(255);

-- Create a test superadmin with password "admin123" (CHANGE IN PRODUCTION!)
-- Password hash for "admin123" using bcrypt
UPDATE platform_admins 
SET password_hash = '$2a$10$rZJ3qGXxJ5wZ5qGXxJ5wZOqGXxJ5wZ5qGXxJ5wZ5qGXxJ5wZ5qGXx'
WHERE email = 'admin@axiom.com';

-- Note: This is a placeholder hash. After running the backend, 
-- you should create a proper admin account through the auth endpoint.
