# Architecture

> How the system is structured. Update this as architecture evolves.

---

## High-Level Overview

```
[Draw your system diagram here using ASCII or describe it]

┌─────────────────┐     ┌─────────────────┐
│    Frontend     │────▶│     Backend     │
└─────────────────┘     └─────────────────┘
                              │
                              ▼
                        ┌─────────────────┐
                        │    Database     │
                        └─────────────────┘
```

## Folder Structure

```
project-root/
├── src/                  # Source code
│   ├── components/       # Reusable UI components
│   ├── pages/            # Page components
│   ├── utils/            # Helper functions
│   └── ...
├── public/               # Static assets
├── .agent/               # AI knowledge system
└── ...
```

## Key Components

### Component 1
- **Purpose:** [What it does]
- **Location:** [File path]
- **Dependencies:** [What it relies on]

### Component 2
- **Purpose:** [What it does]
- **Location:** [File path]
- **Dependencies:** [What it relies on]

## Data Flow

1. [Step 1: User does X]
2. [Step 2: System processes Y]
3. [Step 3: Data flows to Z]

## API Structure

| Endpoint | Method | Purpose |
|----------|--------|---------|
| /api/... | GET    | ...     |
| /api/... | POST   | ...     |

## Database Schema

[Key tables/collections and their relationships]

## Authentication Flow

[How users log in and sessions are managed]

## Third-Party Services

| Service | Purpose | Config Location |
|---------|---------|-----------------|
| ...     | ...     | ...             |

---

## Architecture Decisions

### Decision 1: [Choice Made]
- **Why:** [Reasoning]
- **Alternatives Considered:** [Other options]
- **Trade-offs:** [Pros and cons]

---

*Keep this updated as the architecture evolves.*
