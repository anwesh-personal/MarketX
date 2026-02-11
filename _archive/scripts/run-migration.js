/**
 * Run Supabase Migration Script
 * Executes SQL migration against Supabase database
 */

const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('❌ Missing SUPABASE_URL or SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
}

async function runMigration() {
    const migrationPath = path.join(__dirname, 'supabase/migrations/20260124000001_create_workflow_engine_tables.sql');

    if (!fs.existsSync(migrationPath)) {
        console.error('❌ Migration file not found:', migrationPath);
        process.exit(1);
    }

    const sql = fs.readFileSync(migrationPath, 'utf8');
    console.log('📋 Migration SQL loaded, length:', sql.length, 'characters');

    // Use Supabase REST API to execute SQL
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ sql_query: sql }),
    });

    if (!response.ok) {
        // Try running the SQL directly via pg endpoint (if available)
        console.log('⚠️ RPC not available, trying direct approach...');

        // Split SQL into individual statements and run them
        const statements = sql
            .split(';')
            .filter(s => s.trim())
            .map(s => s.trim() + ';');

        console.log(`📝 Found ${statements.length} SQL statements`);
        console.log('');
        console.log('========================================');
        console.log('MANUAL EXECUTION REQUIRED');
        console.log('========================================');
        console.log('');
        console.log('Copy the SQL from this file and run it in Supabase SQL Editor:');
        console.log(`${SUPABASE_URL.replace('.co', '.co/dashboard/project/')}/sql`);
        console.log('');
        console.log('File location:', migrationPath);
        console.log('');

        return;
    }

    const result = await response.json();
    console.log('✅ Migration executed successfully!');
    console.log(result);
}

runMigration().catch(err => {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
});
