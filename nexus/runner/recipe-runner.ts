/**
 * Recipe Runner - Execute recipes with context and permissions
 */

import type { Recipe, RecipeResult, RecipeRegistry } from "../types/recipe";
import type { PlanArtifact } from "../types/artifact";
import { buildRecipeContext } from "./context-builder";
import { resolveApprover, PermissionError } from "../roles/permissions";
import { businessSnapshotRecipe } from "../recipes/business-snapshot";
import { saveArtifact, getNextArtifactVersion } from "../storage/artifacts";
import { generateId, logChange } from "../storage/db";

// ============================================================================
// Recipe Registry (singleton)
// ============================================================================

class RecipeRegistryImpl implements RecipeRegistry {
  recipes: Map<string, Recipe> = new Map();

  register(recipe: Recipe): void {
    this.recipes.set(recipe.id, recipe);
  }

  get(id: string): Recipe | undefined {
    return this.recipes.get(id);
  }

  list(): Recipe[] {
    return Array.from(this.recipes.values());
  }

  listByTag(tag: string): Recipe[] {
    return this.list().filter((r) => r.tags.includes(tag));
  }

  listByIntent(intent: Recipe["intent"]): Recipe[] {
    return this.list().filter((r) => r.intent === intent);
  }
}

const registry = new RecipeRegistryImpl();

// Register built-in recipes
registry.register(businessSnapshotRecipe);

export function getRecipeRegistry(): RecipeRegistry {
  return registry;
}

// ============================================================================
// Run Recipe
// ============================================================================

export interface RunRecipeOptions {
  recipeId: string;
  inputs: Record<string, unknown>;
  skipApprovalCheck?: boolean;  // for testing
  approvalId?: string;          // if resuming an approved plan
}

export async function runRecipe(options: RunRecipeOptions): Promise<RecipeResult> {
  const { recipeId, inputs, skipApprovalCheck, approvalId } = options;

  // 1. Get recipe
  const recipe = registry.get(recipeId);
  if (!recipe) {
    return {
      success: false,
      error: `Recipe not found: ${recipeId}`,
    };
  }

  // 2. Build context
  let ctx;
  try {
    ctx = await buildRecipeContext(recipeId);
  } catch (err) {
    if (err instanceof PermissionError) {
      return {
        success: false,
        error: err.message,
      };
    }
    throw err;
  }

  // 3. Check approval requirements (for write/execute recipes)
  if (!skipApprovalCheck && !approvalId && recipe.classification !== "read") {
    const approval = resolveApprover(ctx.role, recipeId, recipe.classification);

    if (approval.requiresApproval && !approval.canSelfApprove) {
      // Create a pending plan artifact instead of erroring
      const planArtifact = await createPendingPlan(
        ctx.companyId,
        recipeId,
        recipe.name,
        inputs,
        approval.approverRoles || []
      );

      return {
        success: true,  // Plan created successfully
        artifact: planArtifact,
        suggestions: [
          {
            recipeId: "approve-plan",
            label: "Request approval",
            reason: `Plan requires approval from: ${approval.approverRoles?.join(", ")}`,
            confidence: 1.0,
          },
        ],
      };
    }
  }

  // 4. Run recipe
  try {
    const result = await recipe.run(ctx, inputs);
    return result;
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error running recipe",
    };
  }
}

// ============================================================================
// Create Pending Plan Artifact
// ============================================================================

async function createPendingPlan(
  companyId: string,
  recipeId: string,
  recipeName: string,
  inputs: Record<string, unknown>,
  approverRoles: string[]
): Promise<PlanArtifact> {
  const now = new Date().toISOString();
  const version = getNextArtifactVersion(companyId, "plan");

  const planArtifact: PlanArtifact = {
    id: generateId("plan"),
    company_id: companyId,
    type: "plan",
    version,
    data: {
      recipe_id: recipeId,
      status: "pending",
      plan: {
        summary: `Execute recipe: ${recipeName}`,
        steps: [
          {
            order: 1,
            action: "execute_recipe",
            description: `Run ${recipeName} with provided inputs`,
            params: inputs,
          },
        ],
        impacts: ["Will modify company data based on recipe output"],
        reversible: false,
      },
      approval: {
        required_by_role: approverRoles[0] || "ceo",
        requested_at: now,
      },
    },
    created_by: "primary",
    acted_as_role: "",
    created_at: now,
  };

  saveArtifact(planArtifact);
  logChange(companyId, "artifact", planArtifact.id, "create", { type: "plan", status: "pending" });

  return planArtifact;
}

// ============================================================================
// Approve/Reject Plan
// ============================================================================

export interface ApprovePlanOptions {
  planId: string;
  decision: "approve" | "reject";
  decidedBy: string;
  rejectionReason?: string;
}

export async function decidePlan(options: ApprovePlanOptions): Promise<RecipeResult> {
  const { planId, decision, decidedBy, rejectionReason } = options;

  // This is a stub - in full implementation, you would:
  // 1. Load the plan artifact
  // 2. Update its status
  // 3. If approved, run the recipe with the stored inputs
  // 4. Return the result

  return {
    success: true,
    artifact: {
      id: planId,
      company_id: "",
      type: "plan",
      version: 1,
      data: {
        recipe_id: "",
        status: decision === "approve" ? "approved" : "rejected",
        plan: { summary: "", steps: [], impacts: [], reversible: false },
        approval: {
          required_by_role: "",
          requested_at: "",
          decided_at: new Date().toISOString(),
          decided_by: decidedBy,
          decision,
          rejection_reason: rejectionReason,
        },
      },
      created_by: "primary",
      acted_as_role: "",
      created_at: "",
    },
  };
}

// ============================================================================
// Get Recipe by ID
// ============================================================================

export function getRecipe(id: string): Recipe | undefined {
  return registry.get(id);
}

// ============================================================================
// List Available Recipes for Current Role
// ============================================================================

export async function listAvailableRecipes(): Promise<Recipe[]> {
  try {
    const ctx = await buildRecipeContext("*");  // "*" is allowed for all roles
    const allRecipes = registry.list();

    // Filter by role permissions
    if (ctx.role.recipes_allowed.includes("*")) {
      return allRecipes;
    }

    return allRecipes.filter((r) => ctx.role.recipes_allowed.includes(r.id));
  } catch {
    // If no session, return all recipes (for browsing)
    return registry.list();
  }
}
