/**
 * Nexus Suggestion Types
 *
 * Suggestions are the "next best actions" shown after each recipe completes.
 * Maximum 3 suggestions at a time.
 */

export interface Suggestion {
  recipeId: string;
  label: string;
  reason: string;
  confidence: number;  // 0-1
}

/**
 * Generate suggestions based on completed artifact
 * Rules:
 * - Maximum 3 suggestions
 * - Ordered by confidence (highest first)
 * - Must be relevant to the artifact type and content
 */
export function filterSuggestions(suggestions: Suggestion[]): Suggestion[] {
  return suggestions
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);
}
