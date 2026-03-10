# ❓ QUESTIONS & CLARIFICATIONS NEEDED
## Items Requiring Partner Input

---

## 🔴 CRITICAL QUESTIONS (Blocking)

### Q1: Mailwiz API Access

**Question:** Do we have API access to Mailwiz for:
- Sending emails programmatically
- Receiving webhook callbacks for events (clicks, replies, etc.)
- Fetching historical statistics

**Why It Matters:** 
- The learning loop needs stats from Mailwiz
- Real-time reply handling needs webhook integration
- Without this, we can only generate—not close the loop

**Who Answers:** Nino / Tommy

---

### Q2: Stats Data Format

**Question:** What exact format do Mailwiz/IMT stats come in?

**Need:**
- Sample webhook payload for clicks
- Sample webhook payload for replies
- Sample webhook payload for booked calls
- Sample webhook payload for bounces/unsubscribes

**Why It Matters:**
- We need to build ingestion exactly to their format
- Wrong format = broken learning loop

**Who Answers:** Nino

---

### Q3: Identity Graph Integration

**Question:** How does Axiom access identity information?

**Options:**
1. IMT sends identity data with the email reply request
2. Axiom queries an IMT API to get identity
3. Identity is embedded in the email thread context

**Why It Matters:**
- Reply personalization may depend on identity
- Learning loop may segment by identity attributes

**Who Answers:** Tommy / Nino

---

## 🟡 IMPORTANT QUESTIONS (Affects Design)

### Q4: Multi-Client Support

**Question:** Will Axiom serve multiple IMT clients with different KBs?

**Implications:**
- If yes: need per-org KB isolation, brain templates
- If no: simpler single-tenant design

**Current Assumption:** Yes (multi-tenant, per-org brains)

**Who Answers:** Tommy

---

### Q5: Content Approval Workflow

**Question:** Does generated content need human approval before sending?

**Options:**
1. Auto-send (no approval)
2. Queue for review
3. Confidence-based (auto-send if high confidence)

**Why It Matters:**
- Changes API design
- Affects reply latency

**Who Answers:** Fran / Tommy

---

### Q6: Existing n8n Workflows

**Question:** Can we see the current n8n workflows?

**Why:**
- Understand current integration points
- See what triggers reply generation
- Identify any edge cases they handle

**Who Answers:** Nino

---

### Q7: Buyer Stage Detection

**Question:** How is buyer stage determined?

**Options:**
1. IMT provides it with the request
2. Axiom infers it from email content
3. Based on sequence position
4. From identity graph behavior

**Why It Matters:**
- Stage affects angle selection
- Stage affects CTA selection
- Misclassified stage = wrong content

**Who Answers:** Tommy / Fran

---

## 🟢 NICE TO KNOW (Non-Blocking)

### Q8: Landing Page Hosting

**Question:** Where do generated landing pages get hosted?

**Options:**
1. Axiom serves them directly
2. Export to separate hosting
3. Push to their CMS

**Current Assumption:** Axiom serves directly

---

### Q9: Social Content Workflow

**Question:** How do social posts get published?

**Options:**
1. Manual copy-paste
2. Push to Buffer/Hootsuite
3. Direct LinkedIn/X API

**Current Assumption:** Manual for now

---

### Q10: Historical Data

**Question:** Do we have historical performance data to seed the learning loop?

**If Yes:**
- Can jumpstart preferences
- Better starting point

**If No:**
- System starts cold
- Needs 1-2 weeks to accumulate learnings

---

## 📋 INFORMATION ALREADY RECEIVED

| Item | Status | Source |
|------|--------|--------|
| Master KB Rules | ✅ Have | Fran (PDF) |
| Value Proposition | ✅ Have | Fran (doc) |
| System Architecture | ✅ Have | Nino (image) |
| JSON Schemas (01-07) | ✅ Have | Original docs |
| ICP Definition | ⚠️ Partial | In VP doc |
| Offer Definition | ⚠️ Partial | In VP doc |
| Angle Library | ❌ Need | Not provided |
| Example Email Flows | ❌ Need | Not provided |
| Example Replies | ❌ Need | Not provided |

---

## 🎯 NEXT MEETING AGENDA

1. Confirm Mailwiz API access
2. Get sample stats payloads
3. Review n8n workflows
4. Clarify buyer stage source
5. Get example content (flows, replies)

---

*Document: Questions & Clarifications | January 23rd, 2026*
