/**
 * Nexus Context Types
 *
 * Layered context model:
 * - Company Context (truth) - shared, singular source
 * - Role Context (lens) - filters and frames
 * - Session Context (dynamic) - runtime state
 */

// ============================================================================
// Decision Scope - what a role can decide without approval
// ============================================================================

export type DecisionScope =
  | "strategy"      // company direction, pricing, positioning
  | "process"       // workflows, SOPs, cadence
  | "vendors"       // tools, services, contracts
  | "hiring"        // team composition
  | "technical"     // architecture, stack
  | "financial";    // budgets, spend

// ============================================================================
// Visibility Scope - what data/recipes a role can see
// ============================================================================

export type VisibilityScope =
  | "all"           // sees everything
  | "ops"           // operations data
  | "sales"         // pipeline, deals
  | "engineering"   // systems, logs
  | "support"       // tickets, customers
  | "finance";      // revenue, costs

// ============================================================================
// Language Mode - how Nexus frames information
// ============================================================================

export type LanguageMode = "executive" | "operator" | "builder";

// ============================================================================
// Company Profile - shared, singular source of truth
// ============================================================================

export interface CompanyProfile {
  id: string;
  name: string;
  description: string;
  business_model: string;
  goals: string[];
  constraints: string[];
  systems: string[];           // connected tools/platforms
  metrics: Record<string, unknown>;
  context_summary: string;     // CANONICAL: used for grounding all recipes
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Role Profile - lens that filters and frames
// ============================================================================

export interface RoleProfile {
  id: string;
  company_id: string;
  title: string;
  responsibilities: string[];
  decision_scope: DecisionScope[];
  visibility: VisibilityScope[];
  recipes_allowed: string[];              // recipe IDs (no :read suffix)
  recipes_require_approval: string[];     // recipe IDs or "*" for all
  language_mode: LanguageMode;
  is_custom: boolean;
  created_at: string;
}

// ============================================================================
// Session Context - runtime state
// ============================================================================

export interface SessionContext {
  acting_as: string;           // role.id currently active
  confidence: number;          // 0-1, how certain Nexus is about context
  current_focus: string;       // what the user is working on
  company_id: string;          // which company context is loaded
}

// ============================================================================
// Recipe Context - assembled for each recipe run
// ============================================================================

export interface RecipeContext {
  company: CompanyProfile;
  role: RoleProfile;
  session: SessionContext;
  groundingContext: string;    // formatted string for LLM injection
  languageMode: LanguageMode;
  companyId: string;
}

// ============================================================================
// Approval Resolution - determined by policy, not by the plan
// ============================================================================

export interface ApprovalResolution {
  requiresApproval: boolean;
  approverRoles?: string[];
  canSelfApprove?: boolean;
}
