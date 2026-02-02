/**
 * Nexus Artifact Types
 *
 * Artifacts are the outputs of recipes - versioned, stored, and queryable.
 */

// ============================================================================
// Base Artifact
// ============================================================================

export interface Artifact {
  id: string;
  company_id: string;
  type: string;
  version: number;
  data: Record<string, unknown>;
  created_by: string;
  acted_as_role: string;
  created_at: string;
}

// ============================================================================
// Business Snapshot Input
// ============================================================================

export interface BusinessSnapshotInput {
  company_name: string;
  user_role: string;
  business_description: string;
  products_services: string;
  revenue_streams?: string;
  key_costs?: string;
  current_goals: string;
  biggest_challenges?: string;
}

// ============================================================================
// Business Snapshot Synthesis - LLM-generated analysis
// ============================================================================

export interface BusinessSynthesis {
  one_liner: string;
  business_model: string;
  value_proposition: string;
  revenue_model: string;
  cost_structure: string;
  strategic_priorities: string[];  // max 3
  identified_risks: string[];      // max 3
  recommended_focus: string;
}

// ============================================================================
// Business Snapshot Artifact
// ============================================================================

export interface BusinessSnapshotArtifact extends Artifact {
  type: "business-snapshot";
  data: {
    inputs: BusinessSnapshotInput;
    synthesis: BusinessSynthesis;
    context_summary: string;
  };
}

// ============================================================================
// Plan Artifact - for write/execute recipes requiring approval
// ============================================================================

export type PlanStatus =
  | "draft"
  | "pending"
  | "approved"
  | "rejected"
  | "completed"
  | "failed";

export interface PlanStep {
  order: number;
  action: string;
  description: string;
  params: Record<string, unknown>;
  estimated_impact?: string;
}

export interface PlanArtifact extends Artifact {
  type: "plan";
  data: {
    recipe_id: string;
    status: PlanStatus;
    plan: {
      summary: string;
      steps: PlanStep[];
      impacts: string[];
      reversible: boolean;
    };
    approval: {
      required_by_role: string;
      requested_at: string;
      decided_at?: string;
      decided_by?: string;
      decision?: "approve" | "reject";
      rejection_reason?: string;
    };
    execution?: {
      started_at: string;
      completed_at?: string;
      result?: unknown;
      error?: string;
    };
  };
}

// ============================================================================
// Artifact Query Options
// ============================================================================

export interface ArtifactQueryOptions {
  company_id?: string;
  type?: string;
  created_by?: string;
  acted_as_role?: string;
  limit?: number;
  offset?: number;
  order_by?: "created_at" | "version";
  order_dir?: "asc" | "desc";
}
