# 🗄️ SUPABASE DATABASE SETUP GUIDE

## What We're Creating

A production PostgreSQL database with 8 tables optimized for the Axiom Engine:

1. **knowledge_bases** - Single source of truth (JSONB)
2. **runs** - Execution logs
3. **generated_content** - Individual content pieces with KB links
4. **analytics_events** - Raw events from all channels
5. **aggregated_metrics** - Pre-computed for fast learning
6. **learning_history** - Audit trail of KB mutations
7. **ops_config** - Operational configuration
8. **system_logs** - Structured application logs

---

## Step 1: Create Supabase Project

1. Go to https://supabase.com
2. Create new project
3. Choose region (closest to your users)
4. Set a strong database password (save it!)
5. Wait for provisioning (~2 minutes)

---

## Step 2: Get Connection Details

Once ready, go to **Settings > Database**

You'll need:
- **Connection String** (for Node.js)
- **Direct Connection** (for migrations)
- **API URL** (for frontend)
- **Anon/Service Keys** (for authentication)

---

## Step 3: Run Initial Migration

### Option A: Via Supabase SQL Editor (Easiest)

1. Open your project
2. Go to **SQL Editor**
3. Click **New Query**
4. Copy entire contents of `database/init.sql`
5. Click **Run**
6. Verify: 8 tables created + 1 default ops_config row

### Option B: Via Command Line

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Run migration
psql "YOUR_CONNECTION_STRING" < database/init.sql
```

---

## Step 4: Update Backend .env

Create `apps/backend/.env`:

```bash
# Supabase Connection (from Settings > Database)
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"

# Or use connection pooler (recommended for serverless)
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:6543/postgres?pgbouncer=true"

# Node Environment
NODE_ENV=development
PORT=8080

# Ops
DAILY_RUN_TIME=06:00
```

---

## Step 5: Verify Connection

```bash
cd apps/backend
npm run dev
```

You should see:
```
✅ Database connected at: [timestamp]
🚀 Market Writer SaaS API running on port 8080
```

---

## Database Features

### JSONB Optimization
- GIN indexes on KB brand, ICPs, offers
- Fast queries on nested JSON
- No schema migrations needed for KB structure changes

### Performance
- Indexes on all common query patterns
- Partial indexes for primary outcomes (BOOKED_CALL)
- Pre-aggregated metrics table

### Safety
- Only one active KB at a time (constraint)
- Only one active ops_config at a time
- Idempotency keys for event deduplication
- Soft deletes (paused content, not deleted)

### Analytics
- Full KB component attribution
- Time-series indexes for daily learning loop
- Context-based segmentation (ICP + offer + buyer_stage)

---

## Next Steps After Setup

1. ✅ Insert sample Knowledge Base JSON
2. ✅ Test Writer Engine (generate content)
3. ✅ Send test analytics events
4. ✅ Run learning loop manually
5. ✅ Verify KB updates

---

## Troubleshooting

### Connection Failed
- Check password is correct
- Verify project is not paused
- Try connection pooler URL (port 6543)

### Migration Errors
- Run queries one section at a time
- Check UUID extension is enabled
- Verify you have CREATE TABLE permissions

### Slow Queries
- Check indexes are created: `\di` in psql
- Verify JSONB indexes: `SELECT * FROM pg_indexes WHERE tablename = 'knowledge_bases';`

---

**Ready to connect!** Just need your Supabase credentials. 🚀
