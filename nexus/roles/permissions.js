/**
 * Role Permissions - Check if roles can run recipes
 */
import { getRolesForCompany } from "../storage/roles";
// ============================================================================
// Check if Role Can Run Recipe
// ============================================================================
export function canRunRecipe(role, recipeId) {
    // Wildcard allows all recipes
    if (role.recipes_allowed.includes("*")) {
        return true;
    }
    return role.recipes_allowed.includes(recipeId);
}
// ============================================================================
// Resolve Approval Requirements
// ============================================================================
export function resolveApprover(actingRole, recipeId, classification) {
    // Read recipes never require approval
    if (classification === "read") {
        return { requiresApproval: false };
    }
    // Check if recipe requires approval for this role
    const needsApproval = actingRole.recipes_require_approval.includes("*") ||
        actingRole.recipes_require_approval.includes(recipeId);
    if (!needsApproval) {
        return { requiresApproval: false };
    }
    // Determine who can approve
    // Rule: approval must come from a role with higher decision_scope
    const approverRoles = findApproverRoles(actingRole, recipeId);
    // If acting role has strategy scope (CEO), self-approval is allowed
    if (actingRole.decision_scope.includes("strategy")) {
        return {
            requiresApproval: true,
            approverRoles: [actingRole.id],
            canSelfApprove: true,
        };
    }
    return {
        requiresApproval: true,
        approverRoles,
        canSelfApprove: false,
    };
}
// ============================================================================
// Find Roles That Can Approve
// ============================================================================
function findApproverRoles(actingRole, _recipeId) {
    // Get all roles for company
    const allRoles = getRolesForCompany(actingRole.company_id);
    // Find roles with broader decision scope
    const approvers = [];
    for (const role of allRoles) {
        // Skip the acting role
        if (role.id === actingRole.id)
            continue;
        // Check if role has broader scope
        const hasBroaderScope = role.decision_scope.some(scope => !actingRole.decision_scope.includes(scope));
        // Strategy scope can approve anything
        const hasStrategyScope = role.decision_scope.includes("strategy");
        if (hasBroaderScope || hasStrategyScope) {
            approvers.push(role.id);
        }
    }
    return approvers;
}
// ============================================================================
// Check Visibility
// ============================================================================
export function canSeeData(role, dataScope) {
    // "all" visibility sees everything
    if (role.visibility.includes("all")) {
        return true;
    }
    return role.visibility.includes(dataScope);
}
// ============================================================================
// Permission Error
// ============================================================================
export class PermissionError extends Error {
    constructor(message) {
        super(message);
        this.name = "PermissionError";
    }
}
