/**
 * Company Storage - CRUD operations for company profiles
 */

import { getDb, generateId, logChange } from "./db";
import type { CompanyProfile } from "../types/context";

// ============================================================================
// Row type from SQLite
// ============================================================================

interface CompanyRow {
  id: string;
  name: string;
  description: string | null;
  business_model: string | null;
  goals: string | null;
  constraints: string | null;
  systems: string | null;
  metrics: string | null;
  context_summary: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Convert row to CompanyProfile
// ============================================================================

function rowToCompany(row: CompanyRow): CompanyProfile {
  return {
    id: row.id,
    name: row.name,
    description: row.description || "",
    business_model: row.business_model || "",
    goals: row.goals ? JSON.parse(row.goals) : [],
    constraints: row.constraints ? JSON.parse(row.constraints) : [],
    systems: row.systems ? JSON.parse(row.systems) : [],
    metrics: row.metrics ? JSON.parse(row.metrics) : {},
    context_summary: row.context_summary || "",
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// ============================================================================
// Create Company
// ============================================================================

export function createCompany(
  name: string,
  description: string = ""
): CompanyProfile {
  const db = getDb();
  const now = new Date().toISOString();
  const id = generateId("co");

  db.prepare(`
    INSERT INTO company (id, name, description, goals, constraints, systems, metrics, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, description, "[]", "[]", "[]", "{}", now, now);

  const company = getCompanyById(id);
  if (!company) throw new Error("Failed to create company");

  logChange(id, "company", id, "create", { name });

  return company;
}

// ============================================================================
// Get Company by ID
// ============================================================================

export function getCompanyById(id: string): CompanyProfile | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM company WHERE id = ?").get(id) as CompanyRow | undefined;
  return row ? rowToCompany(row) : null;
}

// ============================================================================
// Get Primary Company (first/only company for v1)
// ============================================================================

export function getPrimaryCompany(): CompanyProfile | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM company ORDER BY created_at ASC LIMIT 1").get() as CompanyRow | undefined;
  return row ? rowToCompany(row) : null;
}

// ============================================================================
// Get or Create Primary Company
// ============================================================================

export function getOrCreatePrimaryCompany(name: string = "My Company"): CompanyProfile {
  const existing = getPrimaryCompany();
  if (existing) return existing;
  return createCompany(name);
}

// ============================================================================
// Update Company
// ============================================================================

export interface UpdateCompanyData {
  name?: string;
  description?: string;
  business_model?: string;
  goals?: string[];
  constraints?: string[];
  systems?: string[];
  metrics?: Record<string, unknown>;
  context_summary?: string;
}

export function updateCompany(id: string, data: UpdateCompanyData): CompanyProfile {
  const db = getDb();
  const now = new Date().toISOString();

  const updates: string[] = [];
  const values: unknown[] = [];

  if (data.name !== undefined) {
    updates.push("name = ?");
    values.push(data.name);
  }
  if (data.description !== undefined) {
    updates.push("description = ?");
    values.push(data.description);
  }
  if (data.business_model !== undefined) {
    updates.push("business_model = ?");
    values.push(data.business_model);
  }
  if (data.goals !== undefined) {
    updates.push("goals = ?");
    values.push(JSON.stringify(data.goals));
  }
  if (data.constraints !== undefined) {
    updates.push("constraints = ?");
    values.push(JSON.stringify(data.constraints));
  }
  if (data.systems !== undefined) {
    updates.push("systems = ?");
    values.push(JSON.stringify(data.systems));
  }
  if (data.metrics !== undefined) {
    updates.push("metrics = ?");
    values.push(JSON.stringify(data.metrics));
  }
  if (data.context_summary !== undefined) {
    updates.push("context_summary = ?");
    values.push(data.context_summary);
  }

  updates.push("updated_at = ?");
  values.push(now);
  values.push(id);

  db.prepare(`UPDATE company SET ${updates.join(", ")} WHERE id = ?`).run(...values);

  const company = getCompanyById(id);
  if (!company) throw new Error("Company not found after update");

  logChange(id, "company", id, "update", data);

  return company;
}

// ============================================================================
// Update Company from Business Snapshot
// ============================================================================

export interface BusinessSnapshotUpdate {
  name: string;
  description: string;
  business_model: string;
  context_summary: string;
  goals?: string[];
}

export function updateCompanyFromSnapshot(
  id: string,
  data: BusinessSnapshotUpdate
): CompanyProfile {
  return updateCompany(id, {
    name: data.name,
    description: data.description,
    business_model: data.business_model,
    context_summary: data.context_summary,
    goals: data.goals,
  });
}

// ============================================================================
// List All Companies (for multi-company future)
// ============================================================================

export function listCompanies(): CompanyProfile[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM company ORDER BY created_at ASC").all() as CompanyRow[];
  return rows.map(rowToCompany);
}
