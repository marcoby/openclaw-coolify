/**
 * Business Snapshot - Synthesis Prompt + Zod Validation
 */

import { z } from "zod";
import type { BusinessSnapshotInput, BusinessSynthesis } from "../../types/artifact";

// ============================================================================
// Zod Schema (strict validation)
// ============================================================================

export const BusinessSynthesisSchema = z.object({
  one_liner: z.string().min(10).max(240),
  business_model: z.string().min(10).max(800),
  value_proposition: z.string().min(5).max(500),
  revenue_model: z.string().min(5).max(500),
  cost_structure: z.string().min(5).max(500),
  strategic_priorities: z.array(z.string().min(3).max(140)).min(1).max(3),
  identified_risks: z.array(z.string().min(3).max(140)).max(3),
  recommended_focus: z.string().min(5).max(300),
});

export type ValidatedSynthesis = z.infer<typeof BusinessSynthesisSchema>;

// ============================================================================
// Build Synthesis Prompt
// ============================================================================

export function buildSynthesisPrompt(inputs: BusinessSnapshotInput): string {
  return `You are creating a Business Snapshot for a Nexus user.
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

Respond with only the JSON object, no markdown fences.`;
}

// ============================================================================
// Build Repair Prompt
// ============================================================================

export function buildRepairPrompt(invalidContent: string, errors: string[]): string {
  return `The following output is invalid JSON for a Business Snapshot synthesis.

Validation errors:
${errors.map(e => `- ${e}`).join("\n")}

Invalid output:
${invalidContent}

Required schema:
{
  "one_liner": string (10-240 chars),
  "business_model": string (10-800 chars),
  "value_proposition": string (5-500 chars),
  "revenue_model": string (5-500 chars),
  "cost_structure": string (5-500 chars),
  "strategic_priorities": string[] (1-3 items, each 3-140 chars),
  "identified_risks": string[] (0-3 items, each 3-140 chars),
  "recommended_focus": string (5-300 chars)
}

Output corrected JSON only, no markdown fences.`;
}

// ============================================================================
// Validate Synthesis (with Zod)
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  parsed?: BusinessSynthesis;
  errors?: string[];
  raw?: unknown;
}

export function validateSynthesis(content: string): ValidationResult {
  // Step 1: Parse JSON
  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch {
    // Try to extract JSON from markdown fences
    const match = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      try {
        raw = JSON.parse(match[1]);
      } catch {
        return { valid: false, errors: ["Failed to parse JSON from response"] };
      }
    } else {
      return { valid: false, errors: ["Failed to parse JSON from response"] };
    }
  }

  // Step 2: Validate with Zod
  const result = BusinessSynthesisSchema.safeParse(raw);

  if (!result.success) {
    const errors = result.error.errors.map(
      (e) => `${e.path.join(".")}: ${e.message}`
    );
    return { valid: false, errors, raw };
  }

  // Step 3: Enforce max array lengths (truncate if over)
  const synthesis = result.data;
  if (synthesis.strategic_priorities.length > 3) {
    synthesis.strategic_priorities = synthesis.strategic_priorities.slice(0, 3);
  }
  if (synthesis.identified_risks.length > 3) {
    synthesis.identified_risks = synthesis.identified_risks.slice(0, 3);
  }

  return { valid: true, parsed: synthesis as BusinessSynthesis };
}

// ============================================================================
// Generate Context Summary
// ============================================================================

export function generateContextSummary(
  inputs: BusinessSnapshotInput,
  synthesis: BusinessSynthesis
): string {
  const priorities = synthesis.strategic_priorities.join(", ");
  const risks = synthesis.identified_risks.length > 0
    ? synthesis.identified_risks.join("; ")
    : "None identified";

  return `${inputs.company_name} is a business that ${inputs.business_description.toLowerCase()}. ` +
    `${synthesis.business_model} ` +
    `Revenue model: ${synthesis.revenue_model}. ` +
    `Cost structure: ${synthesis.cost_structure}. ` +
    `Current strategic priorities: ${priorities}. ` +
    `Key risks: ${risks}. ` +
    `Recommended focus: ${synthesis.recommended_focus}`;
}
