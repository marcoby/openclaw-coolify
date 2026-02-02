/**
 * Business Snapshot - Guided Input Steps
 */
export const BUSINESS_SNAPSHOT_STEPS = [
    {
        id: "q1",
        question: "What's your company or project name?",
        placeholder: "Acme Corp",
        inputKey: "company_name",
        required: true,
    },
    {
        id: "q2",
        question: "What's your role?",
        placeholder: "Founder, CEO, Operations Lead...",
        inputKey: "user_role",
        required: true,
    },
    {
        id: "q3",
        question: "In one or two sentences, what does your business do?",
        placeholder: "We help small businesses automate their invoicing...",
        inputKey: "business_description",
        required: true,
        helpText: "Don't overthink it. Just describe what you do.",
    },
    {
        id: "q4",
        question: "What products or services do you offer?",
        placeholder: "SaaS platform, consulting, physical products...",
        inputKey: "products_services",
        required: true,
    },
    {
        id: "q5",
        question: "How do you make money? (revenue streams)",
        placeholder: "Subscriptions, one-time sales, retainers...",
        inputKey: "revenue_streams",
        required: false,
        helpText: "Skip if you're pre-revenue",
    },
    {
        id: "q6",
        question: "What are your biggest costs or expenses?",
        placeholder: "Payroll, hosting, marketing, inventory...",
        inputKey: "key_costs",
        required: false,
    },
    {
        id: "q7",
        question: "What are your top 3 priorities right now?",
        placeholder: "Launch v2, hire first employee, hit $10k MRR...",
        inputKey: "current_goals",
        required: true,
        helpText: "Be specific. These become your focus areas.",
    },
    {
        id: "q8",
        question: "What's your biggest challenge or blocker?",
        placeholder: "Not enough time, unclear positioning, cash flow...",
        inputKey: "biggest_challenges",
        required: false,
    },
];
/**
 * Validate that all required inputs are present
 */
export function validateInputs(inputs) {
    const missing = [];
    for (const step of BUSINESS_SNAPSHOT_STEPS) {
        if (step.required && !inputs[step.inputKey]) {
            missing.push(step.inputKey);
        }
    }
    return {
        valid: missing.length === 0,
        missing,
    };
}
