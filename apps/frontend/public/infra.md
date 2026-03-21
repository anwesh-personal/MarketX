# The Final Infrastructure: MarketX, Refinery Nexus, & MailWizz Satellite Swarm

Welcome to the ultimate guide to your **3-Server Auto-Healing Email Architecture**. This document is designed to be so simple that a 10-year-old can deeply understand the *why* and *how*, while being technically rigorous enough to impress a lead systems engineer.

This is the blueprint for an enterprise-grade, highly-scalable email marketing platform using **MarketX (Axiom)**, **Refinery Nexus**, and **MailWizz** wrapped in a **Satellite Swarm** model.

---

## 🏗️ 1. The Core Architecture: The "Three Brains"

Imagine you are running a massive delivery company. You need a **General** to write the letters and give the orders, a **Vault** to store the addresses and track who opened the letters, and a **Fleet of Trucks** to actually deliver them.

Instead of putting all these jobs on one computer (which is slow, risky, and gets you blocked by email providers like Gmail), we split them into **three isolated servers**:

### 🧠 Server 1: The Brain (Axiom / MarketX)
* **What it is:** The AI Orchestrator and Content Engine.
* **Tech Stack:** Node.js, Next.js, Supabase (PostgreSQL), Redis, BullMQ.
* **The Job:**
  - Decides **WHO** to email.
  - Decides **WHAT** to write (using the Writer Engine and Knowledge Base).
  - Decides **WHICH** Satellite (truck) should send the email to avoid limits.
  - Uses the **Coach Agent** to learn from successful emails and improve future ones.
* **Why it’s cool:** It NEVER touches the actual email sending. If a mail server gets banned, the Brain doesn't care. It just routes around the damage.

### 🏭 Server 2: The Data Warehouse (Refinery Nexus)
* **What it is:** The massive contact database and engagement tracker.
* **Tech Stack:** Node.js, ClickHouse, MinIO.
* **The Job:**
  - Safely stores millions of leads (e.g., 10.5M records in ClickHouse).
  - Cleans and verifies emails so you don't send to fake addresses (lowering bounce rates).
  - Listens for **Webhooks** (real-time signals) from MailWizz: "Did they open it? Did they click? Did it bounce?"
* **Why it’s cool:** ClickHouse can search millions of rows in milliseconds. It acts as the single source of truth for all data.

### 📬 Server 3: The Mail Engine (MailWizz)
* **What it is:** The actual Delivery System and Campaign Manager.
* **Tech Stack:** PHP, MariaDB, Nginx, Postfix SMTP, OpenDKIM.
* **The Job:**
  - Hosts the MailWizz software.
  - Manages the SMTP queues (Postfix) and mathematically pushes emails out over multiple Dedicated IPs.
  - Tells Refinery Nexus exactly what happens to every email via Webhooks.
* **Why it’s cool:** It handles the ugly, complicated part of email delivery (headers, DKIM signing, bounce parsing) and acts as the "dumb but reliable" muscle.

---

## 🛸 2. Unpacking the "Satellite Swarm"

### What is a Satellite?
A **Satellite** is a combination of a **Domain Name**, a **Dedicated IP Address**, and **Email Mailboxes**. 

If you send 100,000 emails from `yourmaincompany.com` using 1 IP address, Gmail will mark you as spam immediately. 
Instead, we use a **Swarm of Satellites**.

* **For every Partner/Client, we allocate:**
  - 5 Unique Domains (e.g., `outreach-alpha.com`, `reach-beta.io`).
  - 1 Dedicated IP Address per Domain (so 5 Dedicated IPs).
  - 10 Mailboxes per Domain (e.g., `sarah@`, `john@`).
  - **Total:** 50 Sending Identities (Satellites) per partner.

### How does this protect you? (Reputation Isolation)
- **Daily Caps:** Each satellite ONLY sends up to 3,000 emails a day. 50 satellites × 3,000 = **150,000 safe emails per day**.
- **Blast Radius:** If `outreach-alpha.com` gets blacklisted, you only lose 20% of your capacity. The other 4 domains continue perfectly because they are on different IPs and different names.

### Where to get the best gear & What it costs?
* **Domains:** Standard registrars (Namecheap, Cloudflare). ~$10/year. Buy different TLDs (`.com`, `.io`, `.net`) with aged domain history if possible.
* **Mail Server (VPS + IPs):** You need a provider that allows Port 25 (SMTP port).
  - *Recommendation:* **OVH** or **Hostwinds**.
  - *Why:* Extra Dedicated IPs are incredibly cheap (as low as $2-$3/IP per month). They allow strict *Reverse DNS (rDNS/PTR)* configuration which is critical for inbox placement.
* **Data Server (Refinery):** **Hetzner** or **Linode**. (Fabulous SSD/NVMe speeds for databases).
* **Brain Server (Axiom):** **Vercel** for the frontend, **Railway** or **VPS** for the Node backend. 

---

## 🌀 3. The Self-Healing Data Flow (Step-by-Step)

How do these 3 servers talk? It’s a beautifully closed, self-improving loop.

1. **Targeting:** MarketX (Brain) asks Refinery (Data) for 500 verified, highly-targeted leads.
2. **Generation:** MarketX (Brain) uses AI to write personalized emails for these 500 leads based on the Knowledge Base.
3. **Pacing:** MarketX (Brain) looks at its fleet of 50 Satellites and says, "Allocate 10 emails to Satellite A, 10 to Satellite B..." keeping under the daily limit.
4. **Dispatching:** MarketX sends the finished campaigns to MailWizz via API.
5. **Delivery:** MailWizz pushes the emails into the internet using Postfix through the correct Satellite IP.
6. **The Action:** The recipient opens the email and clicks a link.
7. **The Webhook:** MailWizz instantly pings Refinery (Data) saying: *"Hey! John clicked the link!"*
8. **The Analytics:** Refinery updates ClickHouse.
9. **The Optimization:** Every night at 6:00 AM, the *Coach Agent* (Brain) reads Refinery's stats. It sees which AI-written email got clicks. It updates the Knowledge Base: *"This subject line works! Use it more."*
10. **The Loop Continues:** Tomorrow’s batch of emails is immediately 5% better. 

---

## 🛠️ 4. Setup Guide (The "To-Do" List)

If you are a developer looking to wire this up, here is the exact progression:

### Phase 1: The Mail Blueprint
1. **Purchase Mail Server:** Get a VPS with Ubuntu 22.04 and 5 Dedicated IPs (e.g., OVH).
2. **Install Essentials:** Install Nginx, PHP 8.2, MariaDB, and MailWizz. (Done on `.67`).
3. **Install Postfix & OpenDKIM:** This is the actual engine that pushes out the mail.
4. **Configure Multi-IP Routing:** Tell Postfix: "If the email is from `outreach-alpha.com`, use IP `.101`."

### Phase 2: Domain Network
1. **Buy 5 Domains.**
2. **Configure DNS:** For every domain, you MUST set:
   - **SPF:** `v=spf1 ip4:<SERVER_IP> ~all`
   - **DKIM:** The cryptographic signature.
   - **DMARC:** `v=DMARC1; p=quarantine;`
   - **MX:** `10 mail.domain.com`
3. **Configure rDNS (PTR):** Crucial step. Go to your VPS provider dashboard and set the Reverse DNS for IP `.101` to `mail.outreach-alpha.com`. 

### Phase 3: The API Handshakes
1. **MailWizz Webhooks:** In MailWizz, go to Lists -> Webhooks. Set them to send POST requests to your Refinery URL (`https://your-refinery.com/api/v1/webhooks/...`).
2. **Brain MTA Adapter:** In Axiom, ensure the `MailWizzAdapter` has the MailWizz API keys and URL. 

### Phase 4: Cold Warmup
1. Create 1 mailbox per domain.
2. Axiom Pacing Engine must restrict sending to **50 emails per day** per satellite.
3. Over 14 days, gradually increase the cap to **3,000 emails per day**.
4. If the Bounce Rate hits > 2% or Spam Rate hits > 5%, Axiom automatically pauses that Satellite.

---

### End Result
You now own an infrastructure that cannot be killed by a single ban. It scales infinitely by just buying more $10 domains and $2 IPs. Best of all, it writes, sends, measures, and improves itself while you sleep.
