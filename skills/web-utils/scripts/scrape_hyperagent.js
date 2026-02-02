import { HyperAgent } from "@hyperbrowser/agent";
import { z } from "zod";
// Usage: bun scrape_hyperagent.ts <url>
const url = process.argv[2];
if (!url) {
    console.error(JSON.stringify({ error: "No URL provided" }));
    process.exit(1);
}
// Config: Use env vars or defaults
const llmProvider = process.env.HYPER_LLM_PROVIDER || "openai";
const llmModel = process.env.HYPER_LLM_MODEL || "gpt-4o";
async function main() {
    try {
        const agent = new HyperAgent({
            llm: {
                provider: llmProvider,
                model: llmModel,
                apiKey: process.env.OPENAI_API_KEY // Ensure this is set
            }
        });
        const page = await agent.newPage();
        await page.goto(url, { waitUntil: "load" });
        // Simple extraction task
        const content = await page.extract("Extract the main title and full visible text content of the page.", z.object({
            title: z.string(),
            text: z.string().describe("The full text content excluding navigation and ads"),
        }));
        console.log(JSON.stringify({
            url: url,
            status: 200,
            ...content.output
        }));
        await agent.closeAgent();
    }
    catch (error) {
        console.error(JSON.stringify({ error: error.message }));
        process.exit(1);
    }
}
main();
