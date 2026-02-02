---
name: nexus
description: Business OS - Run structured recipes for company operations, planning, and decision-making
metadata:
  openclaw:
    emoji: "🏢"
    requires:
      bins: []
      services: []
      env: []
    homepage: "https://github.com/marcoby/openclaw-coolify"
    os: ["darwin", "linux"]
---

# Nexus Business OS

Nexus is the Business Operating System layer on top of OpenClaw. It provides **structured recipes** that help users run their business through guided, repeatable actions.

## Core Concepts

### Company Context (Truth)
- Singular source of truth about the business
- Name, description, goals, constraints, systems, metrics
- `context_summary` used to ground all interactions

### Role Context (Lens)
- How information is filtered and framed for the user
- CEO sees strategy, Ops Manager sees execution, Engineer sees systems
- Determines which recipes are available and which need approval

### Recipes (Actions)
- Structured, parameterized workflows with inputs and outputs
- Classification: `read` (immediate) | `write` (needs plan) | `execute` (needs approval)
- All recipes produce **artifacts** stored in SQLite

---

## Available Recipes

### business-snapshot (First Win)
Creates a structured company profile that grounds all future interactions.

**Inputs:**
- `company_name` (required): Company or project name
- `user_role` (required): User's role (Founder, CEO, etc.)
- `business_description` (required): What the business does
- `products_services` (required): Products or services offered
- `revenue_streams` (optional): How money comes in
- `key_costs` (optional): Major expenses
- `current_goals` (required): Top 3 priorities
- `biggest_challenges` (optional): Main blockers

**Output:** Business Snapshot artifact with:
- One-liner description
- Business model analysis
- Revenue/cost structure
- Strategic priorities (max 3)
- Identified risks (max 3)
- Recommended focus

**Classification:** `read` (runs immediately, no approval needed)

---

## How to Run Recipes

### Via Nexus API (Recommended)

```typescript
import { initNexus, runBusinessSnapshot } from "./nexus";

// Initialize (first time)
initNexus("Acme Corp");

// Run recipe
const result = await runBusinessSnapshot({
  company_name: "Acme Corp",
  user_role: "Founder",
  business_description: "We help small businesses automate invoicing",
  products_services: "SaaS invoicing platform",
  current_goals: "Launch v2, hit 100 customers, hire support",
});

console.log(result.artifact);      // The generated snapshot
console.log(result.suggestions);   // 3 recommended next actions
```

### Via CLI Script

```bash
# Run business snapshot
bun run nexus/scripts/run-recipe.ts business-snapshot \
  --company_name "Acme Corp" \
  --user_role "Founder" \
  --business_description "We help small businesses automate invoicing" \
  --products_services "SaaS invoicing platform" \
  --current_goals "Launch v2, hit 100 customers"
```

---

## Role-Based Access

| Role | Can Run | Needs Approval |
|------|---------|----------------|
| CEO / Founder | All recipes | Nothing |
| Operations Manager | ops recipes | vendor-contract, budget-change |
| Technical Builder | engineering recipes | infrastructure-change |
| External Consultant | read-only recipes | Everything |

### Switch Role

```typescript
import { switchRole, getAvailableRoles } from "./nexus";

// List available roles
const roles = getAvailableRoles();

// Switch to ops manager
switchRole("ops-manager");
```

---

## Approval Flow

When a recipe requires approval:

1. Recipe creates a **Plan Artifact** with status `pending`
2. Plan shows: summary, steps, impacts, reversibility
3. Approver can: Approve | Edit | Reject
4. On approval, recipe executes
5. Result stored as artifact

---

## Data Storage

All Nexus state lives in SQLite at:
```
~/.openclaw/state/nexus/nexus.db
```

Tables:
- `company` - Company profile (singular truth)
- `roles` - Role definitions (4 defaults + custom)
- `artifacts` - All recipe outputs (versioned)
- `change_log` - Audit trail (capped at 50 per entity)
- `session` - Current session state

---

## Next Best Actions

After every recipe, Nexus suggests 3 follow-up actions:

```json
[
  { "recipeId": "90-day-plan", "label": "Create your 90-day plan", "confidence": 0.9 },
  { "recipeId": "connect-integration", "label": "Connect your calendar", "confidence": 0.7 },
  { "recipeId": "decision-log", "label": "Start a decision log", "confidence": 0.6 }
]
```

---

## Upcoming Recipes

- **90-day-plan**: Turn priorities into weekly milestones
- **weekly-planning**: Plan the upcoming week
- **daily-standup**: Quick daily check-in
- **decision-log**: Track important decisions
- **process-sop**: Document a standard operating procedure
- **vendor-comparison**: Compare vendor options

---

## Integration with OpenClaw

Nexus calls OpenClaw's `/v1/chat/completions` endpoint for LLM synthesis. The flow:

```
User Input → Nexus Recipe Runner → OpenClaw API → LLM Response
                    ↓
         Zod Validation (parse → validate → repair)
                    ↓
         Dual Write (company table + artifact)
                    ↓
         Return artifact + 3 suggestions
```

All responses are validated with Zod schemas and repaired if invalid (up to 2 attempts).

---

## Environment Variables

```bash
# Required for LLM calls
OPENCLAW_URL=https://assist.marcoby.net
OPENCLAW_TOKEN=your-gateway-token

# Optional
OPENCLAW_MODEL=openclaw
OPENCLAW_AGENT_ID=main
OPENCLAW_TIMEOUT=60000
```
