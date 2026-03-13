# Where belief, RS:OS, and mail engine actually live

Short answer so nobody has to dig again.

---

## 1. Belief and Tommy’s RS:OS stuff — do we have it?

**Yes — but only in the Supabase migration track.**

| What | Where |
|------|--------|
| **belief, brief, icp, offer, partner, belief_competition, flow, signal_event, config_table** | **`supabase/migrations/00000000000012_rs_os_core.sql`** |

So:
- If you run **Supabase** migrations (`supabase db push` or equivalent), **belief and the rest of RS:OS exist** in the DB.
- The **`database/migrations/`** track (000–028) **does not create** `belief`. Migration **028** has `brain_memories.belief_id REFERENCES belief(id)`. So if you **only** run `database/migrations/`, the `belief` table is missing and 028 can fail. That’s why it looks like “we don’t have belief” — it’s in the other track.

**In the app:**
- **Superadmin Briefs:** `/superadmin/briefs` — page and API that use `brief`, `belief`, `belief_competition` (and offer/icp for options). **Not in the sidebar** — you have to open `/superadmin/briefs` directly.
- **Signals gating:** `/api/signals/gating/evaluate` — reads `belief`, writes `belief_gate_snapshot`.
- **Brain tools (026):** Tools reference `belief_id`; brain_learning (028) has `belief_id` on memories.

So: **backend/schema for belief exists (Supabase migration + APIs).** It’s not in the main superadmin nav, and if only `database/migrations` are run, the `belief` table isn’t there.

---

## 2. Mail engine — MailWizz, Amazon SES, etc. Where are they?

**They’re in the frontend and in one webhook; sending may not use them.**

| Piece | Location | Notes |
|------|----------|--------|
| **Config UI** | **`apps/frontend/src/app/superadmin/email-providers/page.tsx`** | Mailwizz, Amazon SES, Custom SMTP. CRUD for email providers. **Not in superadmin sidebar** — go to `/superadmin/email-providers` directly. |
| **Webhook (inbound)** | **`apps/frontend/src/app/api/webhooks/email/mailwizz/route.ts`** | Receives Mailwizz events (delivery, open, click, bounce, etc.), maps to canonical types, inserts into **`signal_event`** (partner_id, offer_id, icp_id, brief_id, belief_id). So **inbound** path is there. |
| **Sending (outbound)** | **`apps/backend`** | `workflowExecutionService.legacy.ts` has `output-email` node: sends via **Resend API or SMTP** (env/config). It does **not** clearly read from the frontend’s email-providers table (MailWizz/SES) to send. So MailWizz/SES might be used only for **receiving** events, not for **sending** in that workflow. |

So: **MailWizz and SES are in the app** (email-providers page + Mailwizz webhook). They’re easy to miss because email-providers isn’t in the nav. The **backend** has generic email send (Resend/SMTP); whether any service actually sends through MailWizz/SES using the DB config needs to be checked.

---

## 3. Why it feels like “we don’t have this”

1. **Two migration tracks** — RS:OS (belief, brief, etc.) lives in **supabase/migrations**. If only **database/migrations** are run, `belief` (and related tables) are never created.
2. **Sidebar** — Briefs and Email Providers pages exist but are **not** in the superadmin sidebar, so they’re hidden unless you know the URLs.
3. **Previous work** — The recent work was migrations idempotency, org_members, RLS, superadmin theme/analytics/licenses, flow doc. That was **not** “implement belief + mail engine”; it was fixing and documenting what was already there. The belief + mail **pieces** were built earlier (schema, briefs API, email-providers UI, mailwizz webhook); they’re just not surfaced or wired in one obvious place.

---

## 4. What to do next (concise)

1. **Unify or document migration strategy** — Either run **supabase/migrations** (so belief exists) or add a **database/migrations** migration that creates `belief` (and any other RS:OS tables you need) so 028 and the app work with only the manual track.
2. **Add to superadmin nav** — ✅ Done. **Briefs**, **Email Providers**, **Belief Dashboard**, **ICP Manager** are now in the superadmin sidebar (group “MarketX” for Briefs/Belief Dashboard/ICP Manager; “System” for Email Providers).
3. **Mail sending** — Decide if workflows should send via MailWizz/SES. If yes, wire the backend to read from the same email-provider config the frontend uses and use that for sending; right now sending is Resend/SMTP in the workflow.
