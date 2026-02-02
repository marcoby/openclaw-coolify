/**
 * Context Builder - Assembles recipe context from company + role + session
 */
import { getCompanyById, getOrCreatePrimaryCompany } from "../storage/company";
import { getRolesForCompany, getRoleById } from "../storage/roles";
import { getDb } from "../storage/db";
import { initializeDefaultRoles, getCeoRole } from "../roles/defaults";
import { canRunRecipe, PermissionError } from "../roles/permissions";
export function loadSession() {
    const db = getDb();
    const row = db.prepare("SELECT * FROM session WHERE id = 'current'").get();
    if (!row || !row.company_id || !row.acting_as) {
        return null;
    }
    return {
        company_id: row.company_id,
        acting_as: row.acting_as,
        confidence: row.confidence,
        current_focus: row.current_focus || "",
    };
}
export function saveSession(session) {
    const db = getDb();
    const now = new Date().toISOString();
    db.prepare(`
    INSERT OR REPLACE INTO session (id, company_id, acting_as, confidence, current_focus, updated_at)
    VALUES ('current', ?, ?, ?, ?, ?)
  `).run(session.company_id, session.acting_as, session.confidence, session.current_focus, now);
}
// ============================================================================
// Initialize Session (for new users)
// ============================================================================
export function initializeSession(companyName = "My Company") {
    // Get or create company
    const company = getOrCreatePrimaryCompany(companyName);
    // Initialize default roles
    initializeDefaultRoles(company.id);
    // Get CEO role as default
    const ceoRole = getCeoRole(company.id);
    if (!ceoRole) {
        throw new Error("Failed to initialize roles");
    }
    // Create session
    const session = {
        company_id: company.id,
        acting_as: ceoRole.id,
        confidence: 1.0,
        current_focus: "",
    };
    saveSession(session);
    return session;
}
// ============================================================================
// Build Recipe Context
// ============================================================================
export async function buildRecipeContext(recipeId) {
    // Load session
    let session = loadSession();
    if (!session) {
        session = initializeSession();
    }
    // Load company
    const company = getCompanyById(session.company_id);
    if (!company) {
        throw new Error(`Company not found: ${session.company_id}`);
    }
    // Load role
    const role = getRoleById(session.acting_as);
    if (!role) {
        throw new Error(`Role not found: ${session.acting_as}`);
    }
    // Check permissions
    if (!canRunRecipe(role, recipeId)) {
        throw new PermissionError(`Role "${role.title}" cannot run recipe "${recipeId}"`);
    }
    // Build grounding context for LLM
    const groundingContext = buildGroundingContext(company, role, session);
    return {
        company,
        role,
        session,
        groundingContext,
        languageMode: role.language_mode,
        companyId: company.id,
    };
}
// ============================================================================
// Build Grounding Context (for LLM injection)
// ============================================================================
function buildGroundingContext(company, role, session) {
    return `## Company Context
${company.context_summary || `${company.name}: ${company.description}`}

## Current Role
Acting as: ${role.title}
Responsibilities: ${role.responsibilities.join(", ")}
Decision scope: ${role.decision_scope.join(", ")}

## Session
Focus: ${session.current_focus || "General"}`;
}
// ============================================================================
// Switch Role
// ============================================================================
export function switchRole(roleId) {
    const session = loadSession();
    if (!session) {
        throw new Error("No active session");
    }
    const role = getRoleById(roleId);
    if (!role) {
        throw new Error(`Role not found: ${roleId}`);
    }
    // Verify role belongs to current company
    if (role.company_id !== session.company_id) {
        throw new Error("Role does not belong to current company");
    }
    const updatedSession = {
        ...session,
        acting_as: roleId,
        confidence: 1.0,
    };
    saveSession(updatedSession);
    return updatedSession;
}
// ============================================================================
// Update Focus
// ============================================================================
export function updateFocus(focus) {
    const session = loadSession();
    if (!session) {
        throw new Error("No active session");
    }
    const updatedSession = {
        ...session,
        current_focus: focus,
    };
    saveSession(updatedSession);
    return updatedSession;
}
// ============================================================================
// Get Available Roles for Current Company
// ============================================================================
export function getAvailableRoles() {
    const session = loadSession();
    if (!session) {
        return [];
    }
    return getRolesForCompany(session.company_id);
}
