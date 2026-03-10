# Agent Knowledge System

> Drop this `.agent` folder into your project root to give the AI IDE persistent memory, rules, and context.

## How It Works

The AI reads these files at the start of each session to understand:
- What your project is about
- How you want things done
- Rules it must follow
- Current state of work

## Folder Structure

```
.agent/
├── knowledge_system/     # Core context files
│   ├── README.md         # This file
│   ├── PROJECT_CONTEXT.md
│   ├── ARCHITECTURE.md
│   ├── TECH_STACK.md
│   ├── RULES.md          # ⚠️ MOST IMPORTANT
│   ├── DESIGN_SYSTEM.md
│   └── PROJECT_STATE.md
├── workflows/            # Reusable procedures
├── Plans/                # Active work tracking
└── Sessions/             # Handover notes
```

## Getting Started

1. **Fill in `PROJECT_CONTEXT.md`** - Describe your project
2. **Customize `RULES.md`** - Add your personal rules
3. **Update `TECH_STACK.md`** - List your technologies
4. **Set up `DESIGN_SYSTEM.md`** - Define your aesthetics

## Tips

- Keep files updated as your project evolves
- Reference specific files in your prompts: "Read RULES.md first"
- Use Sessions/ to leave notes for future sessions
- Create workflows for repetitive tasks

---

*Template for Antigravity IDE Knowledge System*
