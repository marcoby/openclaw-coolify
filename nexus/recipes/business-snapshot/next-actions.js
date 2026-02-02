/**
 * Business Snapshot - Next Best Actions
 */
/**
 * Generate suggested next actions after completing a Business Snapshot
 * Returns max 3 suggestions, ordered by confidence
 */
export function generateNextActions(artifact) {
    const synthesis = artifact.data.synthesis;
    const topPriority = synthesis.strategic_priorities[0] || "your goals";
    const suggestions = [
        {
            recipeId: "90-day-plan",
            label: "Create your 90-day plan",
            reason: `Turn "${topPriority}" into weekly milestones`,
            confidence: 0.9,
        },
        {
            recipeId: "connect-integration",
            label: "Connect your calendar",
            reason: "Let Nexus help manage your time around these priorities",
            confidence: 0.7,
        },
        {
            recipeId: "decision-log",
            label: "Start a decision log",
            reason: "Track choices that affect your business trajectory",
            confidence: 0.6,
        },
    ];
    // Add risk-specific suggestion if there are identified risks
    if (synthesis.identified_risks.length > 0) {
        suggestions.push({
            recipeId: "risk-mitigation",
            label: "Plan risk mitigation",
            reason: `Address: "${synthesis.identified_risks[0]}"`,
            confidence: 0.65,
        });
    }
    // Sort by confidence and return top 3
    return suggestions
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 3);
}
