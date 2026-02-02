/**
 * Artifact Storage - CRUD operations for artifacts
 */

import { getDb, generateId, logChange } from "./db";
import type { Artifact, ArtifactQueryOptions } from "../types/artifact";

// ============================================================================
// Row type from SQLite
// ============================================================================

interface ArtifactRow {
  id: string;
  company_id: string;
  type: string;
  version: number;
  data: string;
  created_by: string;
  acted_as_role: string | null;
  created_at: string;
}

// ============================================================================
// Convert row to Artifact
// ============================================================================

function rowToArtifact(row: ArtifactRow): Artifact {
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

export function getNextArtifactVersion(companyId: string, type: string): number {
  const db = getDb();
  const row = db.prepare(`
    SELECT MAX(version) as max_version
    FROM artifacts
    WHERE company_id = ? AND type = ?
  `).get(companyId, type) as { max_version: number | null } | undefined;

  return (row?.max_version || 0) + 1;
}

// ============================================================================
// Save Artifact
// ============================================================================

export function saveArtifact(artifact: Omit<Artifact, "id"> & { id?: string }): Artifact {
  const db = getDb();
  const id = artifact.id || generateId(artifact.type.substring(0, 2));

  db.prepare(`
    INSERT INTO artifacts (id, company_id, type, version, data, created_by, acted_as_role, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    artifact.company_id,
    artifact.type,
    artifact.version,
    JSON.stringify(artifact.data),
    artifact.created_by,
    artifact.acted_as_role,
    artifact.created_at
  );

  const saved = getArtifactById(id);
  if (!saved) throw new Error("Failed to save artifact");

  logChange(artifact.company_id, "artifact", id, "create", { type: artifact.type, version: artifact.version });

  return saved;
}

// ============================================================================
// Get Artifact by ID
// ============================================================================

export function getArtifactById(id: string): Artifact | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM artifacts WHERE id = ?").get(id) as ArtifactRow | undefined;
  return row ? rowToArtifact(row) : null;
}

// ============================================================================
// Get Latest Artifact of Type
// ============================================================================

export function getLatestArtifact(companyId: string, type: string): Artifact | null {
  const db = getDb();
  const row = db.prepare(`
    SELECT * FROM artifacts
    WHERE company_id = ? AND type = ?
    ORDER BY version DESC
    LIMIT 1
  `).get(companyId, type) as ArtifactRow | undefined;

  return row ? rowToArtifact(row) : null;
}

// ============================================================================
// Query Artifacts
// ============================================================================

export function queryArtifacts(options: ArtifactQueryOptions = {}): Artifact[] {
  const db = getDb();

  const conditions: string[] = [];
  const values: unknown[] = [];

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
  `).all(...values, limit, offset) as ArtifactRow[];

  return rows.map(rowToArtifact);
}

// ============================================================================
// Get All Versions of Artifact Type
// ============================================================================

export function getArtifactVersions(companyId: string, type: string): Artifact[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT * FROM artifacts
    WHERE company_id = ? AND type = ?
    ORDER BY version DESC
  `).all(companyId, type) as ArtifactRow[];

  return rows.map(rowToArtifact);
}

// ============================================================================
// Delete Artifact
// ============================================================================

export function deleteArtifact(id: string): boolean {
  const db = getDb();
  const artifact = getArtifactById(id);
  if (!artifact) return false;

  db.prepare("DELETE FROM artifacts WHERE id = ?").run(id);

  logChange(artifact.company_id, "artifact", id, "delete", { type: artifact.type });

  return true;
}
