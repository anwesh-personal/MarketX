# 🚀 AXIOM ENGINE - QUICK START

## Option A: Docker (Easiest - Everything Included)

1. **Start the full stack**:
   ```bash
   npm run docker:up
   ```

2. **Access the dashboard**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8080/api/stats

3. **View logs**:
   ```bash
   npm run docker:logs
   ```

4. **Stop everything**:
   ```bash
   npm run docker:down
   ```

---

## Option B: Local Development (Hot Reload)

### Prerequisites
- PostgreSQL running locally on port 5432

### 1. Setup Database

```bash
# Create database
createdb market_writer

# Initialize schema
psql market_writer < database/init.sql
```

### 2. Configure Environment

Backend is already configured in `apps/backend/.env`:
```
DATABASE_URL=postgres://user:pass@localhost:5432/market_writer
```

Update with your PostgreSQL credentials if needed.

### 3. Start Dev Servers

```bash
npm run dev
```

This runs both backend and frontend with hot reload!

- Backend: http://localhost:8080
- Frontend: http://localhost:3000

---

## 🎯 What to Explore

### 1. Command Center (`/dashboard`)
- View system KPIs
- Trigger manual runs
- See recent execution logs

### 2. Knowledge Base Manager (`/kb-manager`)
- Upload JSON files
- Zod validation in action
- View active KB structure

### 3. Analytics Deep Dive (`/analytics`)
- Variant performance metrics
- Winner/Loser indicators
- Filter by status

---

## 📝 Next Steps

1. **Create a sample Knowledge Base JSON** matching the schema in:
   - `apps/backend/src/schemas/kb.schema.ts`

2. **Upload it** via `/kb-manager`

3. **Trigger a manual run** from `/dashboard`

4. **View analytics** in `/analytics`

---

## 🔧 Troubleshooting

### Port already in use
```bash
# Kill processes on ports
lsof -ti:8080 | xargs kill
lsof -ti:3000 | xargs kill
```

### Database connection failed
```bash
# Check PostgreSQL is running
pg_isready

# Or use Docker option instead
npm run docker:up
```

### Module not found errors
```bash
# Reinstall dependencies
cd apps/backend && npm install
cd ../frontend && npm install
```

---

**Built with precision. Operates with certainty.** ⚡
