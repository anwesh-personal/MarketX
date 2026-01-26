# Technology Stack

> Reference for all technologies used in the project.

---

## Frontend
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS + CSS Variables for theming
- **State**: React hooks, Context
- **Workflow Canvas**: React Flow
- **UI Components**: Custom + Lucide icons

## Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Queue**: BullMQ + Redis
- **AI**: OpenAI, Anthropic, Google (via aiService)

## Workers
- **Queue System**: BullMQ
- **Workers**: DreamStateWorker, FineTuningWorker, LearningLoopWorker
- **Status**: Built, not deployed

## Infrastructure
- **Dev**: Local (npm run dev)
- **Production**: TBD (Railway? DigitalOcean?)
- **Redis**: Required for queues (not running locally yet)

---

## Key Files
- `apps/frontend/` - Next.js app
- `apps/backend/` - Express API
- `apps/workers/` - BullMQ workers
- `Documentation/` - API docs, architecture notes

---

*Last Updated: 2026-01-26*
