/**
 * Default Role Definitions
 *
 * Nexus ships with 4 default roles. Users can customize or add more.
 */
import { createRole, getRolesForCompany, hasRolesForCompany } from "../storage/roles";
// ============================================================================
// Default Roles
// ============================================================================
export const DEFAULT_ROLES = [
    {
        id: "ceo",
        title: "CEO / Founder",
        responsibilities: [
            "Company strategy and direction",
            "Major financial decisions",
            "Team composition",
            "External partnerships",
        ],
        decision_scope: ["strategy", "financial", "hiring", "vendors"],
        visibility: ["all"],
        recipes_allowed: ["*"], // all recipes
        recipes_require_approval: [], // nothing requires approval
        language_mode: "executive",
    },
    {
        id: "ops-manager",
        title: "Operations Manager",
        responsibilities: [
            "Process execution and improvement",
            "Vendor management",
            "Team coordination",
            "Operational metrics",
        ],
        decision_scope: ["process", "vendors"],
        visibility: ["ops", "support"],
        recipes_allowed: [
            "business-snapshot",
            "weekly-planning",
            "daily-standup",
            "process-sop",
            "vendor-comparison",
        ],
        recipes_require_approval: ["vendor-contract", "budget-change"],
        language_mode: "operator",
    },
    {
        id: "engineer",
        title: "Technical Builder",
        responsibilities: [
            "System architecture",
            "Code quality",
            "Technical debt",
            "Infrastructure",
        ],
        decision_scope: ["technical"],
        visibility: ["engineering"],
        recipes_allowed: [
            "business-snapshot",
            "deploy-checklist",
            "system-health",
            "cost-report",
            "debug-triage",
        ],
        recipes_require_approval: ["infrastructure-change", "vendor-technical"],
        language_mode: "builder",
    },
    {
        id: "consultant",
        title: "External Consultant",
        responsibilities: [
            "Advisory only",
            "Analysis and recommendations",
            "No execution authority",
        ],
        decision_scope: [], // no autonomous decisions
        visibility: ["ops"], // limited view
        recipes_allowed: [
            "business-snapshot",
            "analysis-report",
            "recommendation-doc",
        ],
        recipes_require_approval: ["*"], // everything requires approval
        language_mode: "executive",
    },
];
// ============================================================================
// Initialize Default Roles for Company
// ============================================================================
export function initializeDefaultRoles(companyId) {
    // Skip if roles already exist
    if (hasRolesForCompany(companyId)) {
        return;
    }
    for (const template of DEFAULT_ROLES) {
        createRole({
            company_id: companyId,
            title: template.title,
            responsibilities: template.responsibilities,
            decision_scope: template.decision_scope,
            visibility: template.visibility,
            recipes_allowed: template.recipes_allowed,
            recipes_require_approval: template.recipes_require_approval,
            language_mode: template.language_mode,
            is_custom: false,
        });
    }
}
// ============================================================================
// Get Default Role by Template ID
// ============================================================================
export function getDefaultRoleTemplate(templateId) {
    return DEFAULT_ROLES.find(r => r.id === templateId);
}
// ============================================================================
// Get CEO Role for Company
// ============================================================================
export function getCeoRole(companyId) {
    const roles = getRolesForCompany(companyId);
    return roles.find(r => r.title === "CEO / Founder");
}
