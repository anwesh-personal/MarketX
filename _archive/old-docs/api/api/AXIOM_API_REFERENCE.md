# Axiom API Reference v1.0

**Base URL:** `http://localhost:3001` (Development) / `https://api.axiom.ai` (Production)
**Auth:** Bearer Token (JWT) or API Key
**Content-Type:** `application/json`

---

## 🔐 Authentication

Axiom supports two authentication methods:
1.  **JWT Bearer Token**: For frontend users and superadmins.
2.  **API Key (`x-api-key`)**: For external system integrations (MailWiz, Webhooks).

### Headers
```http
Authorization: Bearer <your_jwt_token>
x-api-key: <your_api_key>
Content-Type: application/json
```

---

## ⚡ Engine Execution

Trigger the core AI engine to generate content.

### **POST /api/run/manual**
Force-trigger a content generation run. Used by the "Run Now" button or external schedulers.

**Request Body:**
```json
{
  "input": {
    "run_type": "ON_DEMAND", // or "SCHEDULED"
    "icp": { "icp_id": "default_icp" },
    "offer": { "offer_id": "default_offer" },
    "generation_requests": {
      "website": {
        "page_types": ["LANDING"]
      },
      "email": {
        "count": 1
      }
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "run_id": "uuid-string",
  "output": { ...generated content... }
}
```

---

## 👷 Worker System (System Triggers)

Endpoints to trigger background jobs. These are typically called by Cron jobs (MailWiz) or Admin actions.

### **POST /api/workers/learning-loop**
Trigger the Daily Learning Loop (Optimization).

**Request Body:**
```json
{
  "type": "full_loop", // Options: "analyze", "promote", "demote", "update_kb", "full_loop"
  "orgId": "org-uuid" // Optional, runs for all if omitted
}
```

### **POST /api/workers/dream-state**
Trigger Idle Optimization (Memory Consolidation).

**Request Body:**
```json
{
  "type": "full_cycle", // Options: "memory_consolidation", "cleanup", "full_cycle"
  "orgId": "org-uuid"
}
```

### **POST /api/workers/fine-tuning**
Start a Fine-Tuning job for a Brain.

**Request Body:**
```json
{
  "type": "start", // Options: "collect", "submit", "deploy"
  "orgId": "org-uuid",
  "brainTemplateId": "brain-uuid",
  "provider": "openai" // or "anthropic", "google"
}
```

### **GET /api/workers/status**
Get real-time stats of the worker queues.

**Response:**
```json
{
  "queues": {
    "dreamState": { "active": 1, "waiting": 0, "completed": 100 },
    "fineTuning": { "active": 0, "waiting": 0, "completed": 5 },
    "learningLoop": { "active": 0, "waiting": 1, "completed": 20 }
  }
}
```

---

## 🧠 Brain System

Manage the AI Brain logic.

### **GET /api/brain/status**
Get the health status of the Brain, Dream State, and Self-Healing circuits.

### **GET /api/kb/active**
Get the currently active Knowledge Base.

### **POST /api/conversations/:id/push-to-brain**
Manually push a conversation to the Brain for learning.

**Request Body:**
```json
{
  "brainTemplateId": "brain-uuid",
  "userId": "user-uuid"
}
```

---

## 📊 Analytics

### **GET /api/analytics/variants**
Get performance stats for different content variants (A/B testing results).

### **POST /api/analytics/event**
Track an external event (e.g., Email Open, Click, Reply).

**Request Body:**
```json
{
  "run_id": "run-uuid",
  "variant_id": "variant-id",
  "event_type": "CLICK", // "OPEN", "REPLY", "BOOKED_CALL", "BOUNCE"
  "payload": { "url": "..." }
}
```
