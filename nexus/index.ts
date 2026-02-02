/**
 * Nexus - Business OS
 *
 * A Business Operating System that runs a user's business through
 * guided, repeatable actions (recipes).
 *
 * Architecture:
 * - Company Context (truth) - shared, singular source
 * - Role Context (lens) - filters and frames
 * - Session Context (dynamic) - runtime state
 *
 * OpenClaw is the runtime for recipes.
 * Nexus is the product layer: profiles, guided flows, artifacts.
 */

// Types
export * from "./types";

// Storage
export * from "./storage";

// Roles
export * from "./roles";

// Runtime
export * from "./runtime";

// Runner
export * from "./runner";

// Connectors
export * from "./plugins/connectors";

// Recipes
export { businessSnapshotRecipe, BUSINESS_SNAPSHOT_STEPS } from "./recipes/business-snapshot";

// ============================================================================
// Quick Start API
// ============================================================================

import { initializeSession, loadSession } from "./runner/context-builder";
import { runRecipe, getRecipeRegistry } from "./runner/recipe-runner";
import { getPrimaryCompany } from "./storage/company";

/**
 * Initialize Nexus for a new user
 */
export function initNexus(companyName?: string) {
  return initializeSession(companyName);
}

/**
 * Check if Nexus is initialized
 */
export function isInitialized(): boolean {
  return loadSession() !== null;
}

/**
 * Get current company profile
 */
export function getCompany() {
  return getPrimaryCompany();
}

/**
 * Run the Business Snapshot recipe (first win)
 */
export async function runBusinessSnapshot(inputs: {
  company_name: string;
  user_role: string;
  business_description: string;
  products_services: string;
  revenue_streams?: string;
  key_costs?: string;
  current_goals: string;
  biggest_challenges?: string;
}) {
  return runRecipe({
    recipeId: "business-snapshot",
    inputs,
  });
}

/**
 * Get all available recipes
 */
export function getRecipes() {
  return getRecipeRegistry().list();
}
