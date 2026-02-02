/**
 * Role Storage - CRUD operations for roles
 */
import { getDb, generateId, logChange } from "./db";
// ============================================================================
// Convert row to RoleProfile
// ============================================================================
function rowToRole(row) {
    return {
        id: row.id,
        company_id: row.company_id,
        title: row.title,
        responsibilities: row.responsibilities ? JSON.parse(row.responsibilities) : [],
        decision_scope: row.decision_scope ? JSON.parse(row.decision_scope) : [],
        visibility: row.visibility ? JSON.parse(row.visibility) : [],
        recipes_allowed: row.recipes_allowed ? JSON.parse(row.recipes_allowed) : [],
        recipes_require_approval: row.recipes_require_approval ? JSON.parse(row.recipes_require_approval) : [],
        language_mode: row.language_mode,
        is_custom: row.is_custom === 1,
        created_at: row.created_at,
    };
}
export function createRole(data) {
    const db = getDb();
    const now = new Date().toISOString();
    const id = generateId("role");
    db.prepare(`
    INSERT INTO roles (
      id, company_id, title, responsibilities, decision_scope, visibility,
      recipes_allowed, recipes_require_approval, language_mode, is_custom, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.company_id, data.title, JSON.stringify(data.responsibilities || []), JSON.stringify(data.decision_scope || []), JSON.stringify(data.visibility || []), JSON.stringify(data.recipes_allowed || []), JSON.stringify(data.recipes_require_approval || []), data.language_mode, data.is_custom ? 1 : 0, now);
    const role = getRoleById(id);
    if (!role)
        throw new Error("Failed to create role");
    logChange(data.company_id, "role", id, "create", { title: data.title });
    return role;
}
// ============================================================================
// Get Role by ID
// ============================================================================
export function getRoleById(id) {
    const db = getDb();
    const row = db.prepare("SELECT * FROM roles WHERE id = ?").get(id);
    return row ? rowToRole(row) : null;
}
// ============================================================================
// Get Roles for Company
// ============================================================================
export function getRolesForCompany(companyId) {
    const db = getDb();
    const rows = db.prepare("SELECT * FROM roles WHERE company_id = ? ORDER BY is_custom ASC, title ASC").all(companyId);
    return rows.map(rowToRole);
}
// ============================================================================
// Get Role by Title (for lookup by name)
// ============================================================================
export function getRoleByTitle(companyId, title) {
    const db = getDb();
    const row = db.prepare("SELECT * FROM roles WHERE company_id = ? AND title = ?").get(companyId, title);
    return row ? rowToRole(row) : null;
}
export function updateRole(id, data) {
    const db = getDb();
    const existing = getRoleById(id);
    if (!existing)
        throw new Error("Role not found");
    const updates = [];
    const values = [];
    if (data.title !== undefined) {
        updates.push("title = ?");
        values.push(data.title);
    }
    if (data.responsibilities !== undefined) {
        updates.push("responsibilities = ?");
        values.push(JSON.stringify(data.responsibilities));
    }
    if (data.decision_scope !== undefined) {
        updates.push("decision_scope = ?");
        values.push(JSON.stringify(data.decision_scope));
    }
    if (data.visibility !== undefined) {
        updates.push("visibility = ?");
        values.push(JSON.stringify(data.visibility));
    }
    if (data.recipes_allowed !== undefined) {
        updates.push("recipes_allowed = ?");
        values.push(JSON.stringify(data.recipes_allowed));
    }
    if (data.recipes_require_approval !== undefined) {
        updates.push("recipes_require_approval = ?");
        values.push(JSON.stringify(data.recipes_require_approval));
    }
    if (data.language_mode !== undefined) {
        updates.push("language_mode = ?");
        values.push(data.language_mode);
    }
    values.push(id);
    db.prepare(`UPDATE roles SET ${updates.join(", ")} WHERE id = ?`).run(...values);
    const role = getRoleById(id);
    if (!role)
        throw new Error("Role not found after update");
    logChange(existing.company_id, "role", id, "update", data);
    return role;
}
// ============================================================================
// Delete Role
// ============================================================================
export function deleteRole(id) {
    const db = getDb();
    const existing = getRoleById(id);
    if (!existing)
        return false;
    db.prepare("DELETE FROM roles WHERE id = ?").run(id);
    logChange(existing.company_id, "role", id, "delete", { title: existing.title });
    return true;
}
// ============================================================================
// Check if Roles Exist for Company
// ============================================================================
export function hasRolesForCompany(companyId) {
    const db = getDb();
    const row = db.prepare("SELECT COUNT(*) as count FROM roles WHERE company_id = ?").get(companyId);
    return row.count > 0;
}
