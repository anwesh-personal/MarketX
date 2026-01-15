-- ============================================================
-- CHECK EXISTING TABLES IN SUPABASE
-- Run this first to see what's already created
-- ============================================================

-- 1. List ALL tables in public schema
SELECT table_name, 
       (SELECT COUNT(*) FROM information_schema.columns WHERE columns.table_name = tables.table_name) as column_count
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 2. Check if AI tables exist
SELECT 
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_providers') as ai_providers_exists,
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_model_metadata') as ai_model_metadata_exists,
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'system_configs') as system_configs_exists;

-- 3. Check if password_hash columns exist
SELECT 
    EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'platform_admins' AND column_name = 'password_hash') as platform_admins_has_password,
    EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'password_hash') as users_has_password;

-- 4. Check platform_admins table
SELECT COUNT(*) as admin_count, 
       jsonb_agg(jsonb_build_object('email', email, 'is_active', is_active)) as admins
FROM platform_admins;

-- 5. List all existing tables (detailed)
SELECT 
    t.table_name,
    (SELECT COUNT(*) FROM information_schema.columns c WHERE c.table_name = t.table_name) as columns,
    pg_size_pretty(pg_total_relation_size(quote_ident(t.table_name)::regclass)) as size
FROM information_schema.tables t
WHERE t.table_schema = 'public' 
  AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name;
