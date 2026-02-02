/**
 * Nexus Suggestion Types
 *
 * Suggestions are the "next best actions" shown after each recipe completes.
 * Maximum 3 suggestions at a time.
 */
/**
 * Generate suggestions based on completed artifact
 * Rules:
 * - Maximum 3 suggestions
 * - Ordered by confidence (highest first)
 * - Must be relevant to the artifact type and content
 */
export function filterSuggestions(suggestions) {
    return suggestions
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 3);
}
