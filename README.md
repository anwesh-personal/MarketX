# Mail Writer - AI-Powered Email Intelligence Platform

**Intelligent Email Composition with Self-Improving Knowledge Base**

A production-grade SaaS platform for AI-powered email writing and optimization.

## Philosophy

> "Writer executes. Analytics observes. KB learns."

We are NOT building a generic AI wrapper. We are building a self-healing marketing infrastructure. The system is deterministic, strictly typed, and fault-tolerant. "Hallucinations" or "Best Guesses" are system failures.

## Architecture

### The Stack

- **Backend (The Brain)**: Node.js + Express + TypeScript + Zod
- **Frontend (The Face)**: Next.js 14 + Tailwind CSS
- **Database (The Memory)**: PostgreSQL 16 with JSONB
- **Orchestration**: Docker Compose

```
┌────────────────┐
│  Next.js Web   │  (Mission Control Dashboard)
└───────┬────────┘
        │ REST API
┌───────▼────────────────────┐
│   Node.js Backend          │
│  ┌──────────────────────┐  │
│  │  Zod Schema Guard    │  │  (The Law)
│  └──────────┬───────────┘  │
│  ┌──────────▼───────────┐  │
│  │  Writer Engine       │  │  (Deterministic Assembly)
│  └──────────────────────┘  │
│  ┌──────────────────────┐  │
│  │  Learning Loop       │  │  (Analytics → KB Updates)
│  └──────────────────────┘  │
│  ┌──────────────────────┐  │
│  │  Ops Scheduler       │  │  (06:00 AM Daily Run)
│  └──────────────────────┘  │
└───────┬────────────────────┘
        │
┌───────▼────────┐
│  PostgreSQL    │  (JSONB Document Store)
└────────────────┘
```

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 20+ (for local development)

### 1. Clone and Setup

```bash
git clone <your-repo-url>
cd Axiom
```

### 2. Start with Docker Compose

```bash
docker-compose up -d
```

This will start:
- **Backend API** on `http://localhost:8080`
- **Frontend** on `http://localhost:3000`
- **PostgreSQL** on port `5432`

### 3. Access Mission Control

Open `http://localhost:3000` in your browser.

## Project Structure

```
Axiom/
├── apps/
│   ├── backend/           # Node.js API
│   │   ├── src/
│   │   │   ├── schemas/   # Zod Schemas (THE LAW)
│   │   │   ├── core/      # Business Logic
│   │   │   ├── routes/    # API Endpoints
│   │   │   ├── db/        # Database Layer
│   │   │   └── index.ts   # Entry Point
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   └── frontend/          # Next.js Dashboard
│       ├── src/
│       │   ├── app/       # Pages (App Router)
│       │   └── lib/       # API Client
│       ├── Dockerfile
│       └── package.json
│
├── database/
│   └── init.sql           # PostgreSQL Schema
│
├── Documentation/         # Project Specs
│   └── Project Docs/
│       ├── 00_Strategy
│       ├── 01_Backend_Specs
│       ├── 02_FE_Specs
│       └── 03_DB_Architecture
│
└── docker-compose.yml
```

## Core Modules

### 1. Writer Engine (`apps/backend/src/core/writer.engine.ts`)

**Responsibility**: Transform `WriterInput` + `KnowledgeBase` → `WriterOutput`

- Uses **exact ID matching** (no embeddings in V1)
- Deterministic blueprint selection
- Content assembly with strict KB constraints

### 2. Learning Loop (`apps/backend/src/core/learning.loop.ts`)

**Responsibility**: Analyze `AnalyticsEvents` → Update `KnowledgeBase`

**Policies**:
- **Winner Rule**: `booked_calls > 0` → Promote variant
- **Loser Rule**: `bounce_rate > 0.15` → Kill variant

**Schedule**: Runs daily at **06:00 AM**

### 3. Ops Scheduler (`apps/backend/src/core/ops.scheduler.ts`)

**Responsibility**: Trigger daily optimization runs

Uses `node-cron` to execute the Learning Loop at 6 AM.

## API Endpoints

### Knowledge Base
- `GET /api/kb/active` - Get active Knowledge Base
- `POST /api/kb/upload` - Upload and validate new KB

### Runs
- `POST /api/run/manual` - Trigger manual run (bypass scheduler)
- `GET /api/runs` - List recent runs

### Analytics
- `GET /api/stats` - Dashboard statistics
- `GET /api/analytics/variants` - Variant performance data
- `POST /api/analytics/event` - Track analytics event

## Development

### Backend

```bash
cd apps/backend
npm install
npm run dev
```

### Frontend

```bash
cd apps/frontend
npm install
npm run dev
```

### Database

```bash
# Initialize schema
psql -U user -d market_writer < database/init.sql
```

## Deployment

### Production Build

```bash
docker-compose up --build -d
```

### Environment Variables

See `.env.example` files in each app directory.

## Design Principles

1. **Schema First**: No logic without Zod schema
2. **No "Any" Types**: TypeScript strict mode mandatory
3. **JSONB Heavy**: Store validated JSON documents for schema flexibility
4. **Error Handling**: Global error handlers, no silent failures
5. **Structured Logging**: JSON format for all system events

## Features

✅ **Deterministic Content Engine**  
✅ **Analytics-Driven Learning Loop**  
✅ **Zod-Validated KB Management**  
✅ **Mission Control Dashboard**  
✅ **Daily Automated Optimization**  
✅ **Variant Performance Tracking**  

## License

Proprietary - All Rights Reserved

---

**Built with precision. Operates with certainty.**
