#!/usr/bin/env bun
/**
 * CLI script for running Nexus recipes
 *
 * Usage:
 *   bun run skills/nexus/scripts/run-recipe.ts business-snapshot \
 *     --company_name "Acme Corp" \
 *     --user_role "Founder" \
 *     --business_description "We help small businesses automate invoicing" \
 *     --products_services "SaaS invoicing platform" \
 *     --current_goals "Launch v2, hit 100 customers"
 */
import { initNexus, isInitialized, runRecipe, getRecipe } from "../../../nexus";
// Parse CLI arguments
function parseArgs(args) {
    const recipeId = args[0];
    if (!recipeId) {
        console.error("Usage: run-recipe.ts <recipe-id> [--key value ...]");
        process.exit(1);
    }
    const inputs = {};
    for (let i = 1; i < args.length; i += 2) {
        const key = args[i];
        const value = args[i + 1];
        if (key?.startsWith("--") && value) {
            inputs[key.slice(2)] = value;
        }
    }
    return { recipeId, inputs };
}
async function main() {
    const args = process.argv.slice(2);
    const { recipeId, inputs } = parseArgs(args);
    // Check if recipe exists
    const recipe = getRecipe(recipeId);
    if (!recipe) {
        console.error(`Recipe not found: ${recipeId}`);
        console.error("\nAvailable recipes:");
        console.error("  - business-snapshot");
        process.exit(1);
    }
    // Initialize Nexus if needed
    if (!isInitialized()) {
        const companyName = inputs.company_name || "My Company";
        console.log(`Initializing Nexus for "${companyName}"...`);
        initNexus(companyName);
    }
    // Run recipe
    console.log(`\nRunning recipe: ${recipe.name}`);
    console.log("Inputs:", JSON.stringify(inputs, null, 2));
    console.log("\n---\n");
    const result = await runRecipe({ recipeId, inputs });
    if (!result.success) {
        console.error("Recipe failed:", result.error);
        process.exit(1);
    }
    // Output result
    console.log("Success!");
    console.log("\nArtifact:");
    console.log(JSON.stringify(result.artifact, null, 2));
    if (result.suggestions?.length) {
        console.log("\nSuggested next actions:");
        for (const suggestion of result.suggestions) {
            console.log(`  - [${suggestion.recipeId}] ${suggestion.label}`);
            console.log(`    ${suggestion.reason}`);
        }
    }
}
main().catch((err) => {
    console.error("Error:", err);
    process.exit(1);
});
