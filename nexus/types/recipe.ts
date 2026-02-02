/**
 * Nexus Recipe Types
 *
 * Recipes are runnable, parameterized workflows with outputs + tracking.
 */

import type { RecipeContext } from "./context";
import type { Artifact } from "./artifact";
import type { Suggestion } from "./suggestion";

// ============================================================================
// Recipe Classification - determines approval requirements
// ============================================================================

export type RecipeClassification = "read" | "write" | "execute";

// Read: no side effects, runs immediately
// Write: produces plan, requires approval before execution
// Execute: performs action after approval

// ============================================================================
// Recipe Intent - what the recipe is trying to accomplish
// ============================================================================

export type RecipeIntent =
  | "plan"        // create a plan or roadmap
  | "summarize"   // synthesize information
  | "decide"      // help make a decision
  | "automate"    // automate a task
  | "monitor";    // track or observe something

// ============================================================================
// Recipe Input - defines what data the recipe needs
// ============================================================================

export interface RecipeInput {
  key: string;
  type: "text" | "date" | "connector" | "file" | "select";
  required: boolean;
  placeholder?: string;
  helpText?: string;
  options?: string[];  // for select type
  validator?: (value: string) => boolean;
}

// ============================================================================
// Recipe Output Types
// ============================================================================

export type RecipeOutputType =
  | "doc"
  | "checklist"
  | "decision"
  | "task-list"
  | "dashboard-widget"
  | "plan";

// ============================================================================
// Recipe Result - what the recipe returns
// ============================================================================

export interface RecipeResult {
  success: boolean;
  artifact?: Artifact;
  suggestions?: Suggestion[];
  error?: string;
}

// ============================================================================
// Recipe Definition
// ============================================================================

export interface Recipe {
  id: string;
  name: string;
  description: string;
  intent: RecipeIntent;
  classification: RecipeClassification;
  inputs: RecipeInput[];
  permissions: string[];        // e.g., "m365.calendar.read"
  outputType: RecipeOutputType;
  tags: string[];
  run: (ctx: RecipeContext, inputs: Record<string, unknown>) => Promise<RecipeResult>;
}

// ============================================================================
// Guided Step - for wizard-style input collection
// ============================================================================

export interface GuidedStep {
  id: string;
  question: string;
  placeholder: string;
  inputKey: string;
  required: boolean;
  helpText?: string;
  validator?: (value: string) => boolean;
}

// ============================================================================
// Recipe Registry
// ============================================================================

export interface RecipeRegistry {
  recipes: Map<string, Recipe>;
  register(recipe: Recipe): void;
  get(id: string): Recipe | undefined;
  list(): Recipe[];
  listByTag(tag: string): Recipe[];
  listByIntent(intent: RecipeIntent): Recipe[];
}
