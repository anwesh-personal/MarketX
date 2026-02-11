#!/bin/bash
# Deploy Axiom Migrations to Supabase
# Date: 2026-01-16

echo "🚀 Deploying Axiom Migrations to Supabase..."
echo ""

# Supabase connection details
SUPABASE_URL="https://uvrpucqzlqhsuttbczbo.supabase.co"
SUPABASE_PROJECT="uvrpucqzlqhsuttbczbo"

# Build connection string (replace with actual password)
# Format: postgresql://postgres:[PASSWORD]@db.uvrpucqzlqhsuttbczbo.supabase.co:5432/postgres
echo "⚠️  You need to provide the Supabase database password"
echo ""
read -sp "Enter Supabase DB Password: " DB_PASSWORD
echo ""

CONNECTION_STRING="postgresql://postgres:${DB_PASSWORD}@db.${SUPABASE_PROJECT}.supabase.co:5432/postgres"

echo ""
echo "📊 Running Migration 006: AI Provider System..."
psql "$CONNECTION_STRING" -f database/migrations/006_ai_provider_system.sql

if [ $? -eq 0 ]; then
    echo "✅ Migration 006 completed successfully"
else
    echo "❌ Migration 006 failed"
    exit 1
fi

echo ""
echo "📊 Running Migration 007: Worker Management..."
psql "$CONNECTION_STRING" -f database/migrations/007_worker_management.sql

if [ $? -eq 0 ]; then
    echo "✅ Migration 007 completed successfully"
else
    echo "❌ Migration 007 failed"
    exit 1
fi

echo ""
echo "🎉 All migrations deployed successfully!"
echo ""
echo "📝 Next steps:"
echo "  1. Verify tables: ai_providers, ai_models, ai_costs, brain_ai_assignments"
echo "  2. Verify tables: workers, worker_templates, worker_deployments"
echo "  3. Test AI Provider Management page"
echo "  4. Test Worker Management page"
echo ""
