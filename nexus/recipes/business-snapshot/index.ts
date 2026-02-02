/**
 * Business Snapshot Recipe
 *
 * The first recipe a user runs in Nexus. Creates a structured company
 * profile that grounds all future interactions.
 */

import type { Recipe, RecipeResult } from "../../types/recipe";
import type { RecipeContext } from "../../types/context";
import type { BusinessSnapshotInput, BusinessSnapshotArtifact, BusinessSynthesis } from "../../types/artifact";
import { updateCompanyFromSnapshot } from "../../storage/company";
import { saveArtifact, getNextArtifactVersion } from "../../storage/artifacts";
import { logChange, generateId } from "../../storage/db";
import { getOpenClawClient, OpenClawError } from "../../runtime/openclaw-client";
import { BUSINESS_SNAPSHOT_STEPS, validateInputs } from "./steps";
import {
  buildSynthesisPrompt,
  buildRepairPrompt,
  validateSynthesis,
  generateContextSummary,
  type ValidationResult,
} from "./prompt";
import { generateNextActions } from "./next-actions";

// ============================================================================
// Recipe Definition
// ============================================================================

export const businessSnapshotRecipe: Recipe = {
  id: "business-snapshot",
  name: "Business Snapshot",
  description: "Create a structured company profile that grounds all future interactions",
  intent: "summarize",
  classification: "read",  // No side effects, runs immediately
  inputs: BUSINESS_SNAPSHOT_STEPS.map((step) => ({
    key: step.inputKey,
    type: "text" as const,
    required: step.required,
    placeholder: step.placeholder,
    helpText: step.helpText,
  })),
  permissions: [],  // No external integrations required
  outputType: "doc",
  tags: ["onboarding", "first-win", "business-owner"],
  run: runBusinessSnapshot,
};

// ============================================================================
// Recipe Runner
// ============================================================================

export async function runBusinessSnapshot(
  ctx: RecipeContext,
  rawInputs: Record<string, unknown>
): Promise<RecipeResult> {
  // 1. Validate inputs
  const validation = validateInputs(rawInputs);
  if (!validation.valid) {
    return {
      success: false,
      error: `Missing required fields: ${validation.missing.join(", ")}`,
    };
  }

  const inputs = rawInputs as unknown as BusinessSnapshotInput;

  // 2. Call LLM for synthesis (with validation + repair loop)
  let synthesis: BusinessSynthesis;
  try {
    synthesis = await callSynthesisWithRepair(inputs);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate synthesis",
    };
  }

  // 3. Generate context summary
  const contextSummary = generateContextSummary(inputs, synthesis);

  // 4. DUAL WRITE: Update company table + create versioned artifact
  const now = new Date().toISOString();
  const companyId = ctx.companyId;

  // 4a. Update company table with synthesized fields
  updateCompanyFromSnapshot(companyId, {
    name: inputs.company_name,
    description: inputs.business_description,
    business_model: synthesis.business_model,
    context_summary: contextSummary,
    goals: synthesis.strategic_priorities,
  });

  // 4b. Create versioned artifact
  const artifactVersion = getNextArtifactVersion(companyId, "business-snapshot");
  const artifact: BusinessSnapshotArtifact = {
    id: generateId("bs"),
    company_id: companyId,
    type: "business-snapshot",
    version: artifactVersion,
    data: {
      inputs,
      synthesis,
      context_summary: contextSummary,
    },
    created_by: "primary",
    acted_as_role: ctx.role.id,
    created_at: now,
  };

  saveArtifact(artifact);

  // 4c. Log changes
  logChange(companyId, "company", companyId, "update", { context_summary: contextSummary });
  logChange(companyId, "artifact", artifact.id, "create", { type: "business-snapshot", version: artifactVersion });

  // 5. Generate next actions
  const suggestions = generateNextActions(artifact);

  return {
    success: true,
    artifact,
    suggestions,
  };
}

// ============================================================================
// LLM Synthesis with Validation + Repair Loop
// ============================================================================

const MAX_REPAIR_ATTEMPTS = 2;

async function callSynthesisWithRepair(inputs: BusinessSnapshotInput): Promise<BusinessSynthesis> {
  const client = getOpenClawClient();
  const prompt = buildSynthesisPrompt(inputs);

  // First attempt
  let response: string;
  try {
    response = await client.chat({
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });
  } catch (error) {
    if (error instanceof OpenClawError) {
      throw new Error(`OpenClaw API error: ${error.message}`);
    }
    throw error;
  }

  // Validate response
  let validation = validateSynthesis(response);
  if (validation.valid && validation.parsed) {
    return validation.parsed;
  }

  // Repair loop
  for (let attempt = 0; attempt < MAX_REPAIR_ATTEMPTS; attempt++) {
    console.log(`[business-snapshot] Repair attempt ${attempt + 1}/${MAX_REPAIR_ATTEMPTS}`);
    console.log(`[business-snapshot] Validation errors: ${validation.errors?.join(", ")}`);

    const repairPrompt = buildRepairPrompt(response, validation.errors || ["Unknown error"]);

    try {
      response = await client.chat({
        messages: [{ role: "user", content: repairPrompt }],
        response_format: { type: "json_object" },
      });
    } catch (error) {
      console.log(`[business-snapshot] Repair attempt ${attempt + 1} failed: ${error}`);
      continue;
    }

    validation = validateSynthesis(response);
    if (validation.valid && validation.parsed) {
      console.log(`[business-snapshot] Repair successful on attempt ${attempt + 1}`);
      return validation.parsed;
    }
  }

  // All repair attempts failed
  throw new Error(
    `Failed to generate valid synthesis after ${MAX_REPAIR_ATTEMPTS} repair attempts. ` +
    `Last errors: ${validation.errors?.join(", ")}`
  );
}

// ============================================================================
// Export steps for guided input UI
// ============================================================================

export { BUSINESS_SNAPSHOT_STEPS } from "./steps";
