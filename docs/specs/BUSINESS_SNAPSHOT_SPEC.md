# Business Snapshot Recipe — Full Specification

> First Win recipe for Nexus. Creates a structured company profile that grounds all future interactions.

---

## 1. Purpose

The Business Snapshot is:
- The **first recipe** a user runs in Nexus
- The **grounding context** for all subsequent recipes
- A **living artifact** that updates as the business evolves
- The proof that Nexus delivers value in <10 minutes

---

## 2. User Journey

```
[User selects "Business Owner" boot profile]
        ↓
[Nexus: "Let's create your Business Snapshot"]
        ↓
[5-7 guided questions — conversational or form]
        ↓
[OpenClaw synthesizes → generates snapshot]
        ↓
[User sees 1-page Business Profile]
        ↓
[Artifact saved to Business Vault]
        ↓
[3 suggested next actions appear]
```

**Time to value: 8-10 minutes**

---

## 3. Data Model

### 3.0 Context Architecture

Nexus operates on a **layered context model**:

```
┌─────────────────────────────────────────────────┐
│           SESSION CONTEXT (dynamic)             │
│  acting_as, current_focus, confidence           │
├─────────────────────────────────────────────────┤
│           ROLE CONTEXT (lens)                   │
│  responsibilities, decision_scope, visibility   │
├─────────────────────────────────────────────────┤
│           COMPANY CONTEXT (truth)               │
│  name, goals, constraints, systems, metrics     │
└─────────────────────────────────────────────────┘
```

**Rule: Company context defines truth. Role context defines action.**

```typescript
// Company Profile — shared, singular source of truth
type CompanyProfile = {
  id: string;
  name: string;
  description: string;
  business_model: string;
  goals: string[];
  constraints: string[];
  systems: string[];           // connected tools/platforms
  metrics: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Role Profile — lens that filters and frames
type RoleProfile = {
  id: string;
  title: string;                           // "CEO", "Operations Manager", "Engineer"
  responsibilities: string[];              // what this role owns
  decision_scope: DecisionScope[];         // what they can decide without approval
  visibility: VisibilityScope[];           // what data/recipes they see
  recipes_allowed: string[];               // recipe IDs this role can run
  recipes_require_approval: string[];      // recipes that need sign-off
  language_mode: "executive" | "operator" | "builder";
}

type DecisionScope =
  | "strategy"      // company direction, pricing, positioning
  | "process"       // workflows, SOPs, cadence
  | "vendors"       // tools, services, contracts
  | "hiring"        // team composition
  | "technical"     // architecture, stack
  | "financial";    // budgets, spend

type VisibilityScope =
  | "all"           // sees everything
  | "ops"           // operations data
  | "sales"         // pipeline, deals
  | "engineering"   // systems, logs
  | "support"       // tickets, customers
  | "finance";      // revenue, costs

// Session Context — runtime state
type SessionContext = {
  acting_as: string;           // role.id currently active
  confidence: number;          // 0-1, how certain Nexus is about context
  current_focus: string;       // what the user is working on
  company_id: string;          // which company context is loaded
}
```

**How role context affects Nexus behavior:**

| Aspect | What Role Controls |
|--------|-------------------|
| **Scope of attention** | What Nexus prioritizes and surfaces |
| **Decision authority** | Recommend vs propose vs ask permission |
| **Language + framing** | Tradeoffs vs checklists vs configs |
| **Recipe availability** | What actions are visible and runnable |

### 3.1 Recipe Definition

```typescript
type Recipe = {
  id: string;
  name: string;
  intent: "plan" | "summarize" | "decide" | "automate" | "monitor";
  inputs: RecipeInput[];
  permissions: string[];
  outputType: "doc" | "checklist" | "decision" | "task-list" | "dashboard-widget";
  run: (ctx: RecipeContext) => Promise<RecipeResult>;
  tags: string[];
}

// Business Snapshot instance
const businessSnapshotRecipe: Recipe = {
  id: "business-snapshot",
  name: "Business Snapshot",
  intent: "summarize",
  inputs: [
    { key: "company_name", type: "text", required: true },
    { key: "user_role", type: "text", required: true },
    { key: "business_description", type: "text", required: true },
    { key: "products_services", type: "text", required: true },
    { key: "revenue_streams", type: "text", required: false },
    { key: "key_costs", type: "text", required: false },
    { key: "current_goals", type: "text", required: true },
    { key: "biggest_challenges", type: "text", required: false },
  ],
  permissions: [], // No external integrations required
  outputType: "doc",
  run: runBusinessSnapshot,
  tags: ["onboarding", "first-win", "business-owner"]
}
```

### 3.2 Input Schema

```typescript
type BusinessSnapshotInput = {
  // Identity
  company_name: string;
  user_role: string;

  // What you do
  business_description: string;      // "What does your business do?"
  products_services: string;         // "What products/services do you offer?"

  // Economics (optional but valuable)
  revenue_streams?: string;          // "How do you make money?"
  key_costs?: string;                // "What are your biggest expenses?"

  // Direction
  current_goals: string;             // "What are your top 3 priorities right now?"
  biggest_challenges?: string;       // "What's blocking you?"
}
```

### 3.3 Output Schema (Artifact)

```typescript
type BusinessSnapshotArtifact = {
  // Metadata
  id: string;                        // uuid
  type: "business-snapshot";
  version: number;                   // increments on update
  created_at: string;                // ISO timestamp
  updated_at: string;

  // Raw inputs (preserved)
  inputs: BusinessSnapshotInput;

  // Synthesized output
  synthesis: {
    one_liner: string;               // "X helps Y do Z"
    business_model: string;          // 2-3 sentences
    value_proposition: string;       // What makes you different
    revenue_model: string;           // How money flows
    cost_structure: string;          // Where money goes
    strategic_priorities: string[];  // 3 items max
    identified_risks: string[];      // Extracted from challenges
    recommended_focus: string;       // Nexus's suggestion
  };

  // For grounding future recipes
  context_summary: string;           // 200-word paragraph for LLM context
}
```

### 3.4 Storage Location

```
~/.openclaw/state/
├── sandboxes.json          # existing - container state
├── artifacts/
│   └── business-snapshot.json   # the snapshot artifact
└── vault/
    └── {artifact-id}.json       # all saved artifacts
```

---

## 4. Guided Input Flow

### 4.1 Question Sequence

Each question is a `GuidedStep`:

```typescript
type GuidedStep = {
  id: string;
  question: string;
  placeholder: string;
  inputKey: keyof BusinessSnapshotInput;
  required: boolean;
  helpText?: string;
  validator?: (value: string) => boolean;
}

const businessSnapshotSteps: GuidedStep[] = [
  {
    id: "q1",
    question: "What's your company or project name?",
    placeholder: "Acme Corp",
    inputKey: "company_name",
    required: true,
  },
  {
    id: "q2",
    question: "What's your role?",
    placeholder: "Founder, CEO, Operations Lead...",
    inputKey: "user_role",
    required: true,
  },
  {
    id: "q3",
    question: "In one or two sentences, what does your business do?",
    placeholder: "We help small businesses automate their invoicing...",
    inputKey: "business_description",
    required: true,
    helpText: "Don't overthink it. Just describe what you do."
  },
  {
    id: "q4",
    question: "What products or services do you offer?",
    placeholder: "SaaS platform, consulting, physical products...",
    inputKey: "products_services",
    required: true,
  },
  {
    id: "q5",
    question: "How do you make money? (revenue streams)",
    placeholder: "Subscriptions, one-time sales, retainers...",
    inputKey: "revenue_streams",
    required: false,
    helpText: "Skip if you're pre-revenue"
  },
  {
    id: "q6",
    question: "What are your biggest costs or expenses?",
    placeholder: "Payroll, hosting, marketing, inventory...",
    inputKey: "key_costs",
    required: false,
  },
  {
    id: "q7",
    question: "What are your top 3 priorities right now?",
    placeholder: "Launch v2, hire first employee, hit $10k MRR...",
    inputKey: "current_goals",
    required: true,
    helpText: "Be specific. These become your focus areas."
  },
  {
    id: "q8",
    question: "What's your biggest challenge or blocker?",
    placeholder: "Not enough time, unclear positioning, cash flow...",
    inputKey: "biggest_challenges",
    required: false,
  },
]
```

### 4.2 UI Behavior

- Show one question at a time (wizard style) OR all at once (form style) — user preference
- All fields are editable before submission
- Skip button on optional fields
- "Back" navigation allowed
- Progress indicator: "Question 3 of 8"

---

## 5. Synthesis Prompt

This is the prompt sent to OpenClaw to generate the synthesis:

```typescript
const synthesisPrompt = (inputs: BusinessSnapshotInput): string => `
You are creating a Business Snapshot for a Nexus user.
Analyze their inputs and produce a structured synthesis.

## User Inputs

Company: ${inputs.company_name}
Role: ${inputs.user_role}
Business Description: ${inputs.business_description}
Products/Services: ${inputs.products_services}
Revenue Streams: ${inputs.revenue_streams || "Not provided"}
Key Costs: ${inputs.key_costs || "Not provided"}
Current Goals: ${inputs.current_goals}
Biggest Challenges: ${inputs.biggest_challenges || "Not provided"}

## Your Task

Generate a JSON object with this exact structure:

{
  "one_liner": "A single sentence: [Company] helps [audience] [achieve outcome]",
  "business_model": "2-3 sentences describing how this business operates",
  "value_proposition": "What makes this business valuable to its customers",
  "revenue_model": "How money comes in (be specific based on their input, or infer if not provided)",
  "cost_structure": "Where money goes (be specific based on their input, or infer if not provided)",
  "strategic_priorities": ["Priority 1", "Priority 2", "Priority 3"],
  "identified_risks": ["Risk 1 extracted from challenges", "Risk 2 if applicable"],
  "recommended_focus": "Your single most important recommendation for what they should focus on next"
}

## Rules

- Be concise. No fluff.
- Use their exact language where possible.
- strategic_priorities should be derived from their goals, max 3.
- identified_risks should be extracted from challenges, max 3. If none provided, infer 1-2 based on business type.
- recommended_focus should be actionable and specific.

Respond with only the JSON object, no markdown.
`;
```

---

## 6. Output Artifact Format

### 6.1 Rendered View (What the user sees)

```
┌─────────────────────────────────────────────────────────────┐
│  BUSINESS SNAPSHOT                                          │
│  Acme Corp                                          v1      │
│  Generated: Feb 1, 2026                                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ONE-LINER                                                  │
│  Acme Corp helps small businesses automate invoicing        │
│  so they get paid faster.                                   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  BUSINESS MODEL                                             │
│  B2B SaaS serving small businesses (1-50 employees).        │
│  Customers pay monthly subscription for automated           │
│  invoicing and payment tracking.                            │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  REVENUE          │  COSTS                                  │
│  • Subscriptions  │  • Hosting (AWS)                        │
│  • Setup fees     │  • Payment processing                   │
│                   │  • Customer support                     │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  STRATEGIC PRIORITIES                                       │
│  1. Launch v2 with recurring invoices                       │
│  2. Hit 100 paying customers                                │
│  3. Hire first support person                               │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  RISKS & BLOCKERS                                           │
│  ⚠ Cash flow tight until reaching 100 customers            │
│  ⚠ Founder doing support + dev = bottleneck                │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  💡 RECOMMENDED FOCUS                                       │
│  Prioritize v2 launch over hiring. More customers =        │
│  more revenue = ability to hire. Ship in 30 days.          │
│                                                             │
└─────────────────────────────────────────────────────────────┘

  [Edit]    [Export PDF]    [Share]
```

### 6.2 Stored JSON

```json
{
  "id": "bs_a1b2c3d4",
  "type": "business-snapshot",
  "version": 1,
  "created_at": "2026-02-01T14:30:00Z",
  "updated_at": "2026-02-01T14:30:00Z",
  "inputs": {
    "company_name": "Acme Corp",
    "user_role": "Founder",
    "business_description": "We help small businesses automate their invoicing",
    "products_services": "SaaS invoicing platform",
    "revenue_streams": "Monthly subscriptions, setup fees",
    "key_costs": "AWS hosting, Stripe fees, my time",
    "current_goals": "Launch v2, hit 100 customers, hire support",
    "biggest_challenges": "Cash flow is tight, I'm doing everything myself"
  },
  "synthesis": {
    "one_liner": "Acme Corp helps small businesses automate invoicing so they get paid faster.",
    "business_model": "B2B SaaS serving small businesses (1-50 employees). Customers pay monthly subscription for automated invoicing and payment tracking.",
    "value_proposition": "Simple, affordable invoicing that saves 5+ hours per week on payment admin.",
    "revenue_model": "Recurring subscriptions ($29-99/mo) + one-time setup fees ($199)",
    "cost_structure": "Cloud infrastructure (AWS), payment processing (Stripe 2.9%), founder time",
    "strategic_priorities": [
      "Launch v2 with recurring invoices",
      "Reach 100 paying customers",
      "Hire first support person"
    ],
    "identified_risks": [
      "Cash flow constrained until customer base grows",
      "Founder bottleneck: doing support + development"
    ],
    "recommended_focus": "Prioritize v2 launch over hiring. More customers = more revenue = ability to hire. Target: ship in 30 days."
  },
  "context_summary": "Acme Corp is a B2B SaaS company founded by a solo founder, providing automated invoicing software to small businesses (1-50 employees). Revenue comes from monthly subscriptions ($29-99/mo) and setup fees. Primary costs are AWS hosting and Stripe payment processing. Current priorities are: launching v2 with recurring invoice support, reaching 100 paying customers, and making first support hire. Key risks include tight cash flow and founder bottleneck. The recommended focus is shipping v2 within 30 days to drive customer growth before hiring."
}
```

---

## 7. Integration with OpenClaw

### 7.1 Execution Flow

```
[Nexus Frontend]
       │
       ▼
┌──────────────────┐
│ Recipe Runner    │ ← Nexus component
│ - validates input│
│ - calls OpenClaw │
│ - saves artifact │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ OpenClaw Runtime │ ← Existing system
│ - LLM call       │
│ - JSON parse     │
│ - Return result  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Artifact Store   │ ← lowdb / file system
│ - Save to vault  │
│ - Index for      │
│   future context │
└──────────────────┘
```

### 7.2 OpenClaw API Call

```typescript
// Pseudo-code for calling OpenClaw
async function runBusinessSnapshot(ctx: RecipeContext): Promise<RecipeResult> {
  const { inputs, companyId } = ctx;

  // 1. Build the synthesis prompt
  const prompt = synthesisPrompt(inputs);

  // 2. Call OpenClaw (or underlying LLM)
  const response = await openclaw.chat({
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" }
  });

  // 3. Parse and validate the synthesis
  const synthesis = await validateAndRepairSynthesis(response.content);

  // 4. Generate context summary
  const contextSummary = generateContextSummary(inputs, synthesis);

  // 5. DUAL WRITE: Update company table (canonical) + create artifact (versioned)
  const now = new Date().toISOString();

  // 5a. Update company table with synthesized fields
  await db.run(`
    UPDATE company SET
      name = ?,
      description = ?,
      business_model = ?,
      context_summary = ?,
      updated_at = ?
    WHERE id = ?
  `, [
    inputs.company_name,
    inputs.business_description,
    synthesis.business_model,
    contextSummary,
    now,
    companyId
  ]);

  // 5b. Create versioned artifact snapshot
  const artifactVersion = await getNextArtifactVersion(companyId, 'business-snapshot');
  const artifact: BusinessSnapshotArtifact = {
    id: `bs_${generateId()}`,
    company_id: companyId,
    type: "business-snapshot",
    version: artifactVersion,
    created_at: now,
    updated_at: now,
    inputs,
    synthesis,
    context_summary: contextSummary
  };
  await saveArtifact(artifact);

  // 5c. Log changes
  await logChange(companyId, 'company', companyId, 'update', { context_summary: contextSummary });
  await logChange(companyId, 'artifact', artifact.id, 'create', artifact);

  return {
    success: true,
    artifact,
    suggestions: generateNextActions(artifact)
  };
}
```

### 7.3 Synthesis Validation + Repair

LLMs sometimes return invalid JSON. Always validate and repair.

```typescript
async function validateAndRepairSynthesis(content: string): Promise<BusinessSynthesis> {
  // 1. Try parse
  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    // Extract JSON from markdown fences if present
    const match = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      parsed = JSON.parse(match[1]);
    } else {
      return await repairSynthesis(content);
    }
  }

  // 2. Validate required keys
  const requiredKeys = [
    'one_liner', 'business_model', 'value_proposition',
    'revenue_model', 'cost_structure', 'strategic_priorities',
    'identified_risks', 'recommended_focus'
  ];
  const missingKeys = requiredKeys.filter(k => !(k in parsed));
  if (missingKeys.length > 0) {
    return await repairSynthesis(content, missingKeys);
  }

  // 3. Validate constraints
  if (parsed.strategic_priorities.length > 3) {
    parsed.strategic_priorities = parsed.strategic_priorities.slice(0, 3);
  }
  if (parsed.identified_risks.length > 3) {
    parsed.identified_risks = parsed.identified_risks.slice(0, 3);
  }

  return parsed as BusinessSynthesis;
}

async function repairSynthesis(invalidContent: string, missingKeys?: string[]): Promise<BusinessSynthesis> {
  const repairPrompt = `
The following output is invalid or incomplete JSON for a Business Snapshot synthesis.
${missingKeys ? `Missing keys: ${missingKeys.join(', ')}` : 'Failed to parse as JSON.'}

Invalid output:
${invalidContent}

Required schema:
{
  "one_liner": string,
  "business_model": string,
  "value_proposition": string,
  "revenue_model": string,
  "cost_structure": string,
  "strategic_priorities": string[] (max 3),
  "identified_risks": string[] (max 3),
  "recommended_focus": string
}

Output corrected JSON only, no markdown fences.
`;

  const response = await openclaw.chat({
    messages: [{ role: "user", content: repairPrompt }],
    response_format: { type: "json_object" }
  });

  return JSON.parse(response.content);
}
```

### 7.3 State File Update

After saving, the state structure becomes:

```json
// ~/.openclaw/state/nexus.json
{
  "user": {
    "onboarded": true,
    "boot_profile": "business-owner",
    "first_win_completed": true
  },
  "artifacts": {
    "business-snapshot": "bs_a1b2c3d4"
  },
  "recipe_history": [
    {
      "recipe_id": "business-snapshot",
      "artifact_id": "bs_a1b2c3d4",
      "completed_at": "2026-02-01T14:30:00Z"
    }
  ]
}
```

---

## 8. Next Best Actions (Post-Snapshot)

After the snapshot is generated, Nexus suggests 3 follow-up actions:

```typescript
function generateNextActions(artifact: BusinessSnapshotArtifact): Suggestion[] {
  return [
    {
      recipeId: "90-day-plan",
      label: "Create your 90-day plan",
      reason: `Turn "${artifact.synthesis.strategic_priorities[0]}" into weekly milestones`,
      confidence: 0.9
    },
    {
      recipeId: "connect-integration",
      label: "Connect your calendar",
      reason: "Let Nexus help manage your time around these priorities",
      confidence: 0.7
    },
    {
      recipeId: "decision-log",
      label: "Start a decision log",
      reason: "Track choices that affect your business trajectory",
      confidence: 0.6
    }
  ];
}
```

---

## 9. Update Flow

The Business Snapshot is a living artifact. Users can update it:

### 9.1 Triggers for Update
- Manual: User clicks "Edit" on the snapshot
- Prompted: After 30 days, Nexus asks "Has anything changed?"
- Contextual: When another recipe detects stale context

### 9.2 Update Behavior
- Show current values as defaults
- Only re-synthesize changed fields
- Increment version number
- Preserve history (optional: keep previous versions)

---

## 10. Default Role Set

Nexus ships with 4 default roles. Users can customize or add more.

### 10.1 Role Definitions

```typescript
const defaultRoles: RoleProfile[] = [
  {
    id: "ceo",
    title: "CEO / Founder",
    responsibilities: [
      "Company strategy and direction",
      "Major financial decisions",
      "Team composition",
      "External partnerships"
    ],
    decision_scope: ["strategy", "financial", "hiring", "vendors"],
    visibility: ["all"],
    recipes_allowed: ["*"],  // all recipes
    recipes_require_approval: [],
    language_mode: "executive"
  },
  {
    id: "ops-manager",
    title: "Operations Manager",
    responsibilities: [
      "Process execution and improvement",
      "Vendor management",
      "Team coordination",
      "Operational metrics"
    ],
    decision_scope: ["process", "vendors"],
    visibility: ["ops", "support"],
    recipes_allowed: [
      "business-snapshot",     // recipe IDs only, no :read suffix
      "weekly-planning",
      "daily-standup",
      "process-sop",
      "vendor-comparison"
    ],
    recipes_require_approval: ["vendor-contract", "budget-change"],
    language_mode: "operator"
  },
  {
    id: "engineer",
    title: "Technical Builder",
    responsibilities: [
      "System architecture",
      "Code quality",
      "Technical debt",
      "Infrastructure"
    ],
    decision_scope: ["technical"],
    visibility: ["engineering"],
    recipes_allowed: [
      "business-snapshot",     // recipe IDs only, no :read suffix
      "deploy-checklist",
      "system-health",
      "cost-report",
      "debug-triage"
    ],
    recipes_require_approval: ["infrastructure-change", "vendor-technical"],
    language_mode: "builder"
  },
  {
    id: "consultant",
    title: "External Consultant",
    responsibilities: [
      "Advisory only",
      "Analysis and recommendations",
      "No execution authority"
    ],
    decision_scope: [],  // no autonomous decisions
    visibility: ["ops"],  // limited view
    recipes_allowed: [
      "business-snapshot",     // recipe IDs only, no :read suffix
      "analysis-report",
      "recommendation-doc"
    ],
    recipes_require_approval: ["*"],  // everything needs approval
    language_mode: "executive"
  }
];

// Recipe permission resolution: use classification, not ID suffixes
// - read recipes: any role with the recipe in recipes_allowed can run immediately
// - write/execute recipes: check recipes_require_approval for plan-first flow
```

### 10.2 Role Selection Flow

During onboarding, after Business Snapshot:

```
NEXUS: One more thing — what's your role at {company_name}?

       → CEO / Founder (full access)
       → Operations Manager
       → Technical Builder
       → Something else...

USER:  [selects or types custom role]

NEXUS: Got it. I'll tailor my recommendations for a {role}.
       You can switch roles anytime with /role.
```

### 10.3 Role Switching

```typescript
// User can switch roles mid-session
type RoleSwitchCommand = {
  command: "/role";
  args: string[];  // e.g., ["/role", "ops-manager"] or ["/role"] to see options
}

// Nexus confirms before switching
// "Switching to Operations Manager. You'll see ops-focused suggestions
//  and some recipes will require approval."
```

### 10.4 Language Mode Examples

How the same information is framed per role:

**Executive mode** (CEO):
> "Revenue is up 12% but CAC increased 20%. Consider whether growth pace justifies acquisition cost."

**Operator mode** (Ops Manager):
> "12% more customers this month. Onboarding queue is 3 days behind. Here's a checklist to clear the backlog."

**Builder mode** (Engineer):
> "Traffic up 12%. p99 latency increased from 180ms to 240ms. Database connection pool may need scaling."

---

## 11. Files to Create

```
nexus/
├── types/
│   ├── recipe.ts           # Recipe, RecipeInput, RecipeResult types
│   ├── artifact.ts         # BusinessSnapshotArtifact, Artifact base type
│   ├── context.ts          # CompanyProfile, RoleProfile, SessionContext
│   └── suggestion.ts       # Suggestion type
├── roles/
│   ├── defaults.ts         # Default role definitions
│   ├── permissions.ts      # Role permission checker
│   └── language.ts         # Language mode formatter
├── recipes/
│   └── business-snapshot/
│       ├── index.ts        # Recipe definition + run function
│       ├── steps.ts        # GuidedStep definitions
│       ├── prompt.ts       # Synthesis prompt builder
│       └── next-actions.ts # Post-completion suggestions
├── storage/
│   ├── artifacts.ts        # Save/load/query artifacts
│   ├── company.ts          # Company profile storage
│   ├── roles.ts            # Role profile storage
│   └── state.ts            # Nexus state management
└── runner/
    ├── recipe-runner.ts    # Execute any recipe
    └── context-builder.ts  # Combine company + role + session context
```

---

## 11. Success Criteria

The Business Snapshot recipe is successful when:

- [ ] User completes all required inputs in <5 minutes
- [ ] Synthesis generates in <10 seconds
- [ ] Output artifact is saved and retrievable
- [ ] Context summary is usable by subsequent recipes
- [ ] 3 relevant next actions are displayed
- [ ] User can edit and regenerate the snapshot
- [ ] Total time from start to "first win" < 10 minutes

---

## 12. Storage Architecture

**Decision: SQLite + file exports**

SQLite is source of truth. Files are for human visibility and sharing.

### 12.1 Directory Structure

```
~/.openclaw/state/
├── sandboxes.json              # existing - container state (OpenClaw)
├── nexus/
│   ├── nexus.db                # SQLite database (source of truth)
│   ├── exports/                # JSON mirrors for debugging
│   │   ├── latest_company.json
│   │   └── latest_roles.json
│   └── artifacts/              # Rendered artifacts for sharing
│       └── <artifact_id>/
│           ├── artifact.json   # structured data
│           └── artifact.md     # human-readable render
```

### 12.2 Database Schema

```sql
-- Core tables (multi-company ready)
CREATE TABLE company (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  business_model TEXT,
  goals TEXT,              -- JSON array
  constraints TEXT,        -- JSON array
  systems TEXT,            -- JSON array
  metrics TEXT,            -- JSON object
  context_summary TEXT,    -- CANONICAL: other tables reference this
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE roles (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,  -- multi-company ready
  title TEXT NOT NULL,
  responsibilities TEXT,   -- JSON array
  decision_scope TEXT,     -- JSON array
  visibility TEXT,         -- JSON array
  recipes_allowed TEXT,    -- JSON array (recipe IDs only, no :read suffix)
  recipes_require_approval TEXT,  -- JSON array
  language_mode TEXT NOT NULL,
  is_custom INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (company_id) REFERENCES company(id)
);

CREATE TABLE artifacts (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,  -- multi-company ready
  type TEXT NOT NULL,      -- 'business-snapshot', 'plan', etc.
  version INTEGER NOT NULL,
  data TEXT NOT NULL,      -- JSON blob (includes context_summary snapshot)
  created_by TEXT DEFAULT 'primary',
  acted_as_role TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (company_id) REFERENCES company(id)
);

CREATE TABLE change_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id TEXT NOT NULL,  -- multi-company ready
  entity_type TEXT NOT NULL,  -- 'company', 'role', 'artifact'
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,       -- 'create', 'update', 'delete'
  diff TEXT,                  -- JSON diff or snapshot
  actor_id TEXT DEFAULT 'primary',
  created_at TEXT NOT NULL,
  FOREIGN KEY (company_id) REFERENCES company(id)
);

-- Indexes
CREATE INDEX idx_roles_company ON roles(company_id);
CREATE INDEX idx_artifacts_company ON artifacts(company_id);
CREATE INDEX idx_artifacts_type ON artifacts(type);
CREATE INDEX idx_artifacts_created ON artifacts(created_at);
CREATE INDEX idx_change_log_company ON change_log(company_id);
CREATE INDEX idx_change_log_entity ON change_log(entity_type, entity_id);
```

### 12.2 Context Injection

When a recipe runs, context is assembled:

```typescript
async function buildRecipeContext(recipeId: string): Promise<RecipeContext> {
  const company = await loadCompanyProfile();
  const roles = await loadRoles();
  const session = await loadSession();

  const activeRole = roles.find(r => r.id === session.acting_as);

  // Check permissions
  if (!canRunRecipe(activeRole, recipeId)) {
    throw new PermissionError(`Role "${activeRole.title}" cannot run "${recipeId}"`);
  }

  // Build grounding context for LLM
  const groundingContext = `
## Company Context
${company.context_summary}

## Current Role
Acting as: ${activeRole.title}
Responsibilities: ${activeRole.responsibilities.join(", ")}
Decision scope: ${activeRole.decision_scope.join(", ")}

## Session
Focus: ${session.current_focus}
`;

  return {
    company,
    role: activeRole,
    session,
    groundingContext,
    languageMode: activeRole.language_mode
  };
}
```

---

## 13. V1 Decisions (Final)

All architectural questions resolved for v1 shipping.

| Question | Decision | Rationale |
|----------|----------|-----------|
| **Storage** | SQLite (better-sqlite3) | Structured queries, durability, multi-user ready |
| **Export** | HTML + Markdown + JSON | No PDF v1; add v1.1 with Puppeteer |
| **Versioning** | Latest profiles + event log; artifacts always versioned | Rollback + audit without complexity |
| **Custom roles** | Yes, using scope templates | Flexibility without arbitrary permissions |
| **Approval flow** | Plan-first approvals | Write recipes produce Plan, then Approve/Edit/Reject |
| **Multi-user** | Single operator v1; schema includes `actor_id` | Multi-user ready without building auth |

---

## 14. Approval Flow

### 14.1 Recipe Classification

```typescript
type RecipeClassification = "read" | "write" | "execute";

// Read: no side effects, runs immediately
// Write: produces plan, requires approval before execution
// Execute: performs action after approval
```

| Classification | Examples | Approval Required |
|---------------|----------|-------------------|
| `read` | business-snapshot, analysis-report | No |
| `write` | update-pricing, change-vendor | Yes (plan first) |
| `execute` | deploy, send-email, create-task | Yes (plan first) |

### 14.2 Approval State Machine

```
                    ┌─────────────┐
                    │   DRAFT     │
                    │ (planning)  │
                    └──────┬──────┘
                           │ recipe completes
                           ▼
                    ┌─────────────┐
         ┌──────────│  PENDING    │──────────┐
         │          │ (awaiting)  │          │
         │          └──────┬──────┘          │
         │                 │                 │
    reject             approve            edit
         │                 │                 │
         ▼                 ▼                 ▼
  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
  │  REJECTED   │   │  APPROVED   │   │   DRAFT     │
  │  (terminal) │   │ (executing) │   │  (revised)  │
  └─────────────┘   └──────┬──────┘   └─────────────┘
                           │
                           │ execution completes
                           ▼
                    ┌─────────────┐
                    │  COMPLETED  │
                    │  (terminal) │
                    └─────────────┘
                           │
                           │ execution fails
                           ▼
                    ┌─────────────┐
                    │   FAILED    │
                    │  (terminal) │
                    └─────────────┘
```

### 14.3 Approval Policy Resolution

**Who must approve is determined by policy, not by the plan itself.**

This prevents the agent from self-assigning approval authority.

```typescript
type ApprovalPolicy = {
  recipeId: string;
  classification: RecipeClassification;
  requiresApproval: boolean;
  approverRoles: string[];  // roles that CAN approve
}

function resolveApprover(
  actingRole: RoleProfile,
  recipeId: string,
  classification: RecipeClassification
): ApprovalResolution {
  // 1. Check if recipe requires approval for this role
  const needsApproval =
    classification !== 'read' &&
    (actingRole.recipes_require_approval.includes('*') ||
     actingRole.recipes_require_approval.includes(recipeId));

  if (!needsApproval) {
    return { requiresApproval: false };
  }

  // 2. Determine who can approve
  // Rule: approval must come from a role with higher decision_scope
  const approverRoles = findRolesWithScope(recipeId);

  // 3. If acting role is CEO (has all scopes), self-approval is allowed
  if (actingRole.decision_scope.includes('strategy')) {
    return {
      requiresApproval: true,
      approverRoles: [actingRole.id],  // self-approval OK
      canSelfApprove: true
    };
  }

  return {
    requiresApproval: true,
    approverRoles,
    canSelfApprove: false
  };
}

type ApprovalResolution = {
  requiresApproval: boolean;
  approverRoles?: string[];
  canSelfApprove?: boolean;
}
```

**Policy rules:**
- `read` recipes: never require approval
- `write`/`execute` recipes: check role's `recipes_require_approval`
- Consultant role: `["*"]` means everything requires approval
- CEO role: `[]` means nothing requires approval (self-approve)

### 14.4 Plan Artifact Schema

```typescript
type PlanArtifact = {
  id: string;
  recipe_id: string;
  status: "draft" | "pending" | "approved" | "rejected" | "completed" | "failed";

  // What the recipe proposes to do
  plan: {
    summary: string;           // "Update pricing tier from $29 to $39"
    steps: PlanStep[];         // Ordered actions
    impacts: string[];         // "Affects 127 active subscribers"
    reversible: boolean;       // Can this be undone?
  };

  // Approval tracking
  approval: {
    required_by_role: string;  // which role must approve
    requested_at: string;
    decided_at?: string;
    decided_by?: string;
    decision?: "approve" | "reject";
    rejection_reason?: string;
  };

  // Execution tracking
  execution?: {
    started_at: string;
    completed_at?: string;
    result?: any;
    error?: string;
  };

  created_at: string;
  updated_at: string;
}

type PlanStep = {
  order: number;
  action: string;              // "update_record", "send_notification", etc.
  description: string;         // Human-readable
  params: Record<string, any>; // Action parameters
  estimated_impact?: string;   // "Modifies 1 record"
}
```

### 14.4 Approval UX Flow

```
USER: /recipe update-pricing

NEXUS: I'll prepare a plan to update your pricing.
       [Gathering current pricing data...]

NEXUS: Here's the proposed plan:

       ┌─────────────────────────────────────────┐
       │  PLAN: Update Pricing Tier              │
       ├─────────────────────────────────────────┤
       │                                         │
       │  SUMMARY                                │
       │  Change Basic tier from $29/mo to $39/mo│
       │                                         │
       │  STEPS                                  │
       │  1. Update pricing in Stripe            │
       │  2. Update pricing on marketing site    │
       │  3. Notify existing subscribers         │
       │                                         │
       │  IMPACT                                 │
       │  • Affects 127 active subscribers       │
       │  • Estimated +$1,270/mo revenue         │
       │                                         │
       │  ⚠️  This action is NOT reversible      │
       │                                         │
       └─────────────────────────────────────────┘

       [Approve]  [Edit]  [Reject]

USER: [clicks Approve]

NEXUS: Executing plan...
       ✓ Step 1: Updated Stripe pricing
       ✓ Step 2: Updated marketing site
       ✓ Step 3: Sent subscriber notifications

       Plan completed successfully.
       [View execution log]
```

---

## 15. V1 Safety Rules

### Data Safety

- No connector writes without explicit approval
- All executions produce an artifact (audit trail)
- Change log capped at 50 entries per entity (auto-prune oldest)

### UX Rules

- 3 suggestions max after each action
- Every new user gets 1 artifact in <10 min
- Role switching requires confirmation only when changing authority level (CEO ↔ non-CEO)

### Permission Rules

- `read` recipes: run immediately for any role with visibility
- `write`/`execute` recipes: check `recipes_allowed` and `recipes_require_approval`
- Consultant role: everything requires approval (no autonomous execution)

---

## 16. Deployment Notes (Coolify + Traefik)

Since this deploys on Coolify with Traefik reverse proxy:

### Business Snapshot Requirements

- **No exposed ports needed** — recipe runs entirely server-side
- **No external integrations** — first-win works with zero connected services
- **WebSocket support required** — for OpenClaw UI real-time updates

### Infrastructure Checklist

```yaml
# Traefik labels (already in docker-compose)
- traefik.enable=true
- traefik.http.routers.openclaw.rule=Host(`${SERVICE_FQDN_OPENCLAW}`)
- traefik.http.services.openclaw.loadbalancer.server.port=18789

# WebSocket support (ensure Traefik config includes)
- traefik.http.middlewares.openclaw-headers.headers.customrequestheaders.Connection=upgrade
- traefik.http.middlewares.openclaw-headers.headers.customrequestheaders.Upgrade=websocket
```

### State Persistence

All Nexus state lives in the mounted volume:

```yaml
volumes:
  - openclaw-config:/root/.openclaw  # includes nexus.db
```

Backup strategy: snapshot the `openclaw-config` volume.

---

## Appendix: Example Session Transcript

```
NEXUS: Welcome to Nexus. Let's start by creating your Business Snapshot.
       This takes about 5 minutes and helps me understand your business.

NEXUS: What's your company or project name?
USER:  Acme Corp

NEXUS: What's your role at Acme Corp?
USER:  Founder and CEO

NEXUS: In one or two sentences, what does Acme Corp do?
USER:  We make invoicing software for freelancers and small businesses

NEXUS: What products or services do you offer?
USER:  A web app for creating and sending invoices, plus a mobile app

NEXUS: How do you make money?
USER:  Monthly subscriptions, $29 for basic, $79 for pro

NEXUS: What are your biggest costs?
USER:  Hosting on AWS, Stripe fees, and honestly just my time

NEXUS: What are your top 3 priorities right now?
USER:  Ship the recurring invoices feature, get to 100 paying users,
       eventually hire someone for support

NEXUS: What's your biggest challenge or blocker?
USER:  I'm doing everything myself and running out of hours in the day

NEXUS: Got it. Generating your Business Snapshot...

       ████████████████████████ 100%

NEXUS: Here's your Business Snapshot.

       [Rendered snapshot appears]

NEXUS: This is now saved as your company profile. I'll use it to give you
       better recommendations.

       What would you like to do next?

       → Create your 90-day plan
       → Connect your calendar
       → Start a decision log
```
