-- ============================================================
-- Add Superadmin Authentication
-- ============================================================
-- This script adds password hash to existing superadmin
-- Email: anweshrath@gmail.com
-- Password: 3edcCDE#
-- Hash (bcrypt): $2b$10$/moEKb.MmnDA4fLrQ3bwB.Ps2Wdayrul9VCgqEMhP/ZBWcaKE/37S
-- ============================================================

-- Update existing superadmin or insert if not exists
INSERT INTO platform_admins (email, full_name, password_hash, is_active)
VALUES (
    'anweshrath@gmail.com',
    'Anwesh Rath',
    '$2b$10$/moEKb.MmnDA4fLrQ3bwB.Ps2Wdayrul9VCgqEMhP/ZBWcaKE/37S',
    true
)
ON CONFLICT (email) 
DO UPDATE SET 
    password_hash = EXCLUDED.password_hash,
    full_name = EXCLUDED.full_name,
    is_active = true;

-- ============================================================
-- Verification Query
-- ============================================================
-- Run this to verify the superadmin was created:
-- SELECT email, full_name, is_active, created_at FROM platform_admins WHERE email = 'anweshrath@gmail.com';
