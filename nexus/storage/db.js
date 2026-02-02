/**
 * Nexus Database - SQLite storage layer
 *
 * Uses better-sqlite3 for synchronous, fast SQLite access.
 * All state lives in ~/.openclaw/state/nexus/nexus.db
 */
import Database from "better-sqlite3";
import { mkdirSync, existsSync } from "fs";
import { join } from "path";
// ============================================================================
// Database Path
// ============================================================================
const STATE_DIR = process.env.OPENCLAW_STATE_DIR || join(process.env.HOME || "/root", ".openclaw");
const NEXUS_DIR = join(STATE_DIR, "state", "nexus");
const DB_PATH = join(NEXUS_DIR, "nexus.db");
// ============================================================================
// Database Instance (singleton)
// ============================================================================
let db = null;
export function getDb() {
    if (!db) {
        // Ensure directory exists
        if (!existsSync(NEXUS_DIR)) {
            mkdirSync(NEXUS_DIR, { recursive: true });
        }
        db = new Database(DB_PATH);
        db.pragma("journal_mode = WAL");
        db.pragma("foreign_keys = ON");
        // Run migrations
        runMigrations(db);
    }
    return db;
}
export function closeDb() {
    if (db) {
        db.close();
        db = null;
    }
}
// ============================================================================
// Migrations
// ============================================================================
const MIGRATIONS = [
    {
        version: 1,
        sql: `
      -- Migration 1: Initial schema

      CREATE TABLE IF NOT EXISTS company (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        business_model TEXT,
        goals TEXT,
        constraints TEXT,
        systems TEXT,
        metrics TEXT,
        context_summary TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS roles (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        title TEXT NOT NULL,
        responsibilities TEXT,
        decision_scope TEXT,
        visibility TEXT,
        recipes_allowed TEXT,
        recipes_require_approval TEXT,
        language_mode TEXT NOT NULL,
        is_custom INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY (company_id) REFERENCES company(id)
      );

      CREATE TABLE IF NOT EXISTS artifacts (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        type TEXT NOT NULL,
        version INTEGER NOT NULL,
        data TEXT NOT NULL,
        created_by TEXT DEFAULT 'primary',
        acted_as_role TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (company_id) REFERENCES company(id)
      );

      CREATE TABLE IF NOT EXISTS change_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_id TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        action TEXT NOT NULL,
        diff TEXT,
        actor_id TEXT DEFAULT 'primary',
        created_at TEXT NOT NULL,
        FOREIGN KEY (company_id) REFERENCES company(id)
      );

      CREATE TABLE IF NOT EXISTS session (
        id TEXT PRIMARY KEY DEFAULT 'current',
        company_id TEXT,
        acting_as TEXT,
        confidence REAL DEFAULT 1.0,
        current_focus TEXT,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (company_id) REFERENCES company(id),
        FOREIGN KEY (acting_as) REFERENCES roles(id)
      );

      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_roles_company ON roles(company_id);
      CREATE INDEX IF NOT EXISTS idx_artifacts_company ON artifacts(company_id);
      CREATE INDEX IF NOT EXISTS idx_artifacts_type ON artifacts(type);
      CREATE INDEX IF NOT EXISTS idx_artifacts_created ON artifacts(created_at);
      CREATE INDEX IF NOT EXISTS idx_change_log_company ON change_log(company_id);
      CREATE INDEX IF NOT EXISTS idx_change_log_entity ON change_log(entity_type, entity_id);

      -- Schema version tracking
      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY
      );
      INSERT OR IGNORE INTO schema_version (version) VALUES (1);
    `,
    },
];
function runMigrations(database) {
    // Get current version
    let currentVersion = 0;
    try {
        const row = database.prepare("SELECT version FROM schema_version ORDER BY version DESC LIMIT 1").get();
        currentVersion = row?.version || 0;
    }
    catch {
        // Table doesn't exist yet, start from 0
    }
    // Run pending migrations
    for (const migration of MIGRATIONS) {
        if (migration.version > currentVersion) {
            database.exec(migration.sql);
            database.prepare("INSERT OR REPLACE INTO schema_version (version) VALUES (?)").run(migration.version);
            console.log(`[nexus/db] Ran migration ${migration.version}`);
        }
    }
}
// ============================================================================
// Change Log - audit trail
// ============================================================================
export function logChange(companyId, entityType, entityId, action, diff, actorId = "primary") {
    const database = getDb();
    database.prepare(`
    INSERT INTO change_log (company_id, entity_type, entity_id, action, diff, actor_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(companyId, entityType, entityId, action, JSON.stringify(diff), actorId, new Date().toISOString());
    // Auto-prune: keep only last 50 entries per entity
    database.prepare(`
    DELETE FROM change_log
    WHERE id NOT IN (
      SELECT id FROM change_log
      WHERE entity_type = ? AND entity_id = ?
      ORDER BY created_at DESC
      LIMIT 50
    )
    AND entity_type = ? AND entity_id = ?
  `).run(entityType, entityId, entityType, entityId);
}
// ============================================================================
// ID Generation
// ============================================================================
export function generateId(prefix = "") {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return prefix ? `${prefix}_${timestamp}${random}` : `${timestamp}${random}`;
}
