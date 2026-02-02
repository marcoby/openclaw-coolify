/**
 * Artifact Storage - CRUD operations for artifacts
 */
import { getDb, generateId, logChange } from "./db";
// ============================================================================
// Convert row to Artifact
// ============================================================================
function rowToArtifact(row) {
    return {
        id: row.id,
        company_id: row.company_id,
        type: row.type,
        version: row.version,
        data: JSON.parse(row.data),
        created_by: row.created_by,
        acted_as_role: row.acted_as_role || "",
        created_at: row.created_at,
    };
}
// ============================================================================
// Get Next Version for Artifact Type
// ============================================================================
export function getNextArtifactVersion(companyId, type) {
    const db = getDb();
    const row = db.prepare(`
    SELECT MAX(version) as max_version
    FROM artifacts
    WHERE company_id = ? AND type = ?
  `).get(companyId, type);
    return (row?.max_version || 0) + 1;
}
// ============================================================================
// Save Artifact
// ============================================================================
export function saveArtifact(artifact) {
    const db = getDb();
    const id = artifact.id || generateId(artifact.type.substring(0, 2));
    db.prepare(`
    INSERT INTO artifacts (id, company_id, type, version, data, created_by, acted_as_role, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, artifact.company_id, artifact.type, artifact.version, JSON.stringify(artifact.data), artifact.created_by, artifact.acted_as_role, artifact.created_at);
    const saved = getArtifactById(id);
    if (!saved)
        throw new Error("Failed to save artifact");
    logChange(artifact.company_id, "artifact", id, "create", { type: artifact.type, version: artifact.version });
    return saved;
}
// ============================================================================
// Get Artifact by ID
// ============================================================================
export function getArtifactById(id) {
    const db = getDb();
    const row = db.prepare("SELECT * FROM artifacts WHERE id = ?").get(id);
    return row ? rowToArtifact(row) : null;
}
// ============================================================================
// Get Latest Artifact of Type
// ============================================================================
export function getLatestArtifact(companyId, type) {
    const db = getDb();
    const row = db.prepare(`
    SELECT * FROM artifacts
    WHERE company_id = ? AND type = ?
    ORDER BY version DESC
    LIMIT 1
  `).get(companyId, type);
    return row ? rowToArtifact(row) : null;
}
// ============================================================================
// Query Artifacts
// ============================================================================
export function queryArtifacts(options = {}) {
    const db = getDb();
    const conditions = [];
    const values = [];
    if (options.company_id) {
        conditions.push("company_id = ?");
        values.push(options.company_id);
    }
    if (options.type) {
        conditions.push("type = ?");
        values.push(options.type);
    }
    if (options.created_by) {
        conditions.push("created_by = ?");
        values.push(options.created_by);
    }
    if (options.acted_as_role) {
        conditions.push("acted_as_role = ?");
        values.push(options.acted_as_role);
    }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const orderBy = options.order_by || "created_at";
    const orderDir = options.order_dir || "desc";
    const limit = options.limit || 100;
    const offset = options.offset || 0;
    const rows = db.prepare(`
    SELECT * FROM artifacts
    ${where}
    ORDER BY ${orderBy} ${orderDir}
    LIMIT ? OFFSET ?
  `).all(...values, limit, offset);
    return rows.map(rowToArtifact);
}
// ============================================================================
// Get All Versions of Artifact Type
// ============================================================================
export function getArtifactVersions(companyId, type) {
    const db = getDb();
    const rows = db.prepare(`
    SELECT * FROM artifacts
    WHERE company_id = ? AND type = ?
    ORDER BY version DESC
  `).all(companyId, type);
    return rows.map(rowToArtifact);
}
// ============================================================================
// Delete Artifact
// ============================================================================
export function deleteArtifact(id) {
    const db = getDb();
    const artifact = getArtifactById(id);
    if (!artifact)
        return false;
    db.prepare("DELETE FROM artifacts WHERE id = ?").run(id);
    logChange(artifact.company_id, "artifact", id, "delete", { type: artifact.type });
    return true;
}
