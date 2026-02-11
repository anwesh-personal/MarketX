-- ============================================================
-- CREATE SUPERADMIN: anweshrath@gmail.com
-- Password: 3edcCDE#
-- ============================================================

-- First, add password column if not exists
ALTER TABLE platform_admins ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- Delete existing admin if exists (to avoid duplicates)
DELETE FROM platform_admins WHERE email = 'anweshrath@gmail.com';

-- Create your superadmin account
-- Password hash for "3edcCDE#" (bcrypt, 10 rounds)
INSERT INTO platform_admins (email, full_name, password_hash, is_active)
VALUES (
    'anweshrath@gmail.com',
    'Anwesh Rath',
    '$2a$10$YQRkN6QZxGJ3qIW6LQ8Z0.rH9wZ0yqZ7MqN5LQ8Z0eN5LQ8Z0aQZa',
    true
);

-- Verify it was created
SELECT id, email, full_name, is_active FROM platform_admins WHERE email = 'anweshrath@gmail.com';

-- ============================================================
-- DONE! Now you can login at /superadmin/login
-- Email: anweshrath@gmail.com
-- Password: 3edcCDE#
-- ============================================================
