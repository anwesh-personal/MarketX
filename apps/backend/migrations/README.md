# 🗄️ DATABASE MIGRATIONS

This directory contains versioned database migrations using `node-pg-migrate`.

## Setup

1. **Install dependencies:**
   ```bash
   cd apps/backend
   npm install
   ```

2. **Configure database connection:**
   
   Update `.migrate.json` with your Supabase credentials:
   ```json
   {
     "host": "db.YOUR_PROJECT_REF.supabase.co",
     "port": 5432,
     "database": "postgres",
     "user": "postgres",
     "password": "YOUR_PASSWORD"
   }
   ```

   Or use `DATABASE_URL` environment variable:
   ```bash
   export DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres"
   ```

## Commands

### Run migrations (create tables)
```bash
npm run migrate:up
```

### Check migration status
```bash
npm run migrate:status
```

### Rollback last migration
```bash
npm run migrate:down
```

### Create a new migration
```bash
npm run migrate:create your-migration-name
```

## Migration Files

- `1737023400000_initial-schema.ts` - Creates all 8 tables + default ops config

## Production Deployment

For Supabase production:

1. Connect to your project
2. Run migrations via CLI:
   ```bash
   DATABASE_URL="your_supabase_url" npm run migrate:up
   ```

3. Verify in Supabase Dashboard > Table Editor

## Troubleshooting

### "relation already exists"
If tables already exist from `init.sql`, drop them first:
```sql
DROP TABLE IF EXISTS system_logs CASCADE;
DROP TABLE IF EXISTS ops_config CASCADE;
DROP TABLE IF EXISTS learning_history CASCADE;
DROP TABLE IF EXISTS aggregated_metrics CASCADE;
DROP TABLE IF EXISTS analytics_events CASCADE;
DROP TABLE IF EXISTS generated_content CASCADE;
DROP TABLE IF EXISTS runs CASCADE;
DROP TABLE IF EXISTS knowledge_bases CASCADE;
```

### Migration tracking table
The system creates a `pgmigrations` table to track applied migrations.

---

**Ready to migrate!** Just run `npm run migrate:up` 🚀
