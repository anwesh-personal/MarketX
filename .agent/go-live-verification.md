# Go-Live Verification — Brain Governance

End-to-end checks for the deploy → email → learning flow. Run these after deploying the brain unification changes.

## Prerequisites

- Frontend and workers running (e.g. `pnpm dev` in apps/frontend, workers in apps/workers).
- Supabase (and Redis/BullMQ) available.
- Superadmin session cookie or token for superadmin APIs.
- User session for main app (Writer, brain chat, analytics).

---

## 1. Superadmin: Deploy active brain

- [ ] Log in at `/superadmin/login`.
- [ ] Open **Brains** → pick a template (or create one) → **Deploy** tab.
- [ ] Deploy to an org; confirm "Active deployments" lists that org.
- [ ] **API check**: `GET /api/superadmin/organizations/[orgId]/active-brain` returns the deployed brain agent (200, body has `id`, `brain_template_id`, `org_id`).

---

## 2. User: Active brain runtime

- [ ] Log in as a user in that org (main app).
- [ ] **API check**: `GET /api/brain/runtime` returns 200 with `templateId`, `promptStack`, `tools`, `provider`, `model`, etc. (no 404/403).

---

## 3. Writer Studio → workflow execution

- [ ] Go to **Writer** → **New** (e.g. `/writer/new`).
- [ ] Select a KB, enter prompt/settings, submit.
- [ ] Redirect to `/writer?execution=<id>` (or similar); note `execution` id.
- [ ] **API check**: `GET /api/engines/executions/[executionId]` returns `status` (e.g. `completed`), and when complete, `output` (from `output_data.finalOutput`), `tokensUsed`, `cost`, `durationMs`.
- [ ] Runs list or Writer history shows the run linked to this execution.

---

## 4. Same pipeline from Workflow Builder / brain tool

- [ ] From Workflow Builder: run a flow that includes email generation (same engine/template as Writer); confirm run appears and execution completes.
- [ ] From Brain Chat: use the generate-email tool (if exposed); confirm it uses the same "Email Nurture Flow" template and execution contract (`trigger: 'brain_tool'`); check runs/executions for the job.

---

## 5. Self-healing and learning

- [ ] **Push to brain**: In Brain Chat, use "Push to brain" on a conversation; confirm job is enqueued (`learningLoop` queue, `conversation-memory-extraction`). After worker run, check `user_memory` for an row with key like `push:<conversationId>`.
- [ ] **Analytics**: Open brain analytics (or call `GET /api/brain/analytics`); response is from `brain_request_logs` (totalRequests, successRate, etc.), not a mock.

---

## 6. No legacy bypass

- [ ] Brain Chat page shows the **active org brain** (read-only), no selector that would switch to a different brain.
- [ ] Writer and workflow execution both require an active deployed brain (`requireActiveBrainRuntime`); unassigned orgs get a clear error.

---

## Sign-off

| Step | Done | Notes |
|------|------|--------|
| 1. Deploy active brain | | |
| 2. Runtime API | | |
| 3. Writer → execution | | |
| 4. Workflow / brain tool | | |
| 5. Push-to-brain + analytics | | |
| 6. No legacy bypass | | |

Once all rows are done, the go-live verification for brain governance is complete.
