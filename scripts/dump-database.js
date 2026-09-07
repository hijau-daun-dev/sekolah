/**
 * dump-database.js
 *
 * Usage: bun scripts/dump-database.js
 *
 * Dump seluruh isi database SQLite ke db/dump.sql (INSERT statements).
 * File dump.sql di-commit ke repo sebagai backup tekststual.
 *
 * Restore: sqlite3 db/custom.db < db/dump.sql  (atau pakai bun:sqlite exec)
 */

import { Database } from "bun:sqlite";
import { writeFileSync, statSync } from "fs";
import { join } from "path";

const DB_PATH = join(import.meta.dir, "..", "db", "custom.db");
const DUMP_PATH = join(import.meta.dir, "..", "db", "dump.sql");

const db = new Database(DB_PATH, { readonly: true });

// Get all tables (exclude sqlite_* internal tables and _prisma_migrations)
const tables = db
  .query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma_%' ORDER BY name")
  .all()
  .map((r) => r.name);

console.log(`Found ${tables.length} tables: ${tables.join(", ")}`);

let sql = "";
sql += "-- Database dump for SIMSEKOLAH\n";
sql += "-- Generated: " + new Date().toISOString() + "\n";
sql += "-- Source: db/custom.db (SQLite)\n";
sql += "-- Tables: " + tables.length + "\n\n";
sql += "PRAGMA foreign_keys=OFF;\n";
sql += "BEGIN TRANSACTION;\n\n";

let totalRows = 0;
const stats = {};

for (const table of tables) {
  // Get columns
  const cols = db.query(`PRAGMA table_info("${table}")`).all();
  const colNames = cols.map((c) => `"${c.name}"`);

  // Get row count
  const countRow = db.query(`SELECT COUNT(*) as cnt FROM "${table}"`).get();
  const rowCount = countRow.cnt;
  stats[table] = rowCount;
  totalRows += rowCount;

  console.log(`  ${table}: ${rowCount} rows`);
  sql += `-- Table: ${table} (${rowCount} rows)\n`;
  sql += `DELETE FROM "${table}";\n`;

  if (rowCount === 0) {
    sql += "\n";
    continue;
  }

  // Fetch all rows
  const rows = db.query(`SELECT ${colNames.join(", ")} FROM "${table}"`).all();

  // Build INSERT statements
  for (const row of rows) {
    const values = cols.map((c) => {
      const v = row[c.name];
      if (v === null || v === undefined) return "NULL";
      if (typeof v === "number") return String(v);
      if (typeof v === "bigint") return v.toString();
      if (typeof v === "boolean") return v ? "1" : "0";
      if (v instanceof Uint8Array) {
        // Buffer/Blob → X'hex'
        const hex = Array.from(v).map((b) => b.toString(16).padStart(2, "0")).join("");
        return "X'" + hex + "'";
      }
      // String — escape single quotes
      const s = String(v);
      return "'" + s.replace(/'/g, "''") + "'";
    });
    sql += `INSERT INTO "${table}" (${colNames.join(", ")}) VALUES (${values.join(", ")});\n`;
  }
  sql += "\n";
}

sql += "COMMIT;\n";
sql += "PRAGMA foreign_keys=ON;\n";

writeFileSync(DUMP_PATH, sql, "utf8");
const dumpSize = statSync(DUMP_PATH).size;

console.log(`\n=== RINGKASAN ===`);
console.log(`Total tables: ${tables.length}`);
console.log(`Total rows: ${totalRows}`);
console.log(`Dump size: ${(dumpSize / 1024).toFixed(1)} KB → ${DUMP_PATH}`);
console.log(`\nTable stats:`);
for (const [t, c] of Object.entries(stats).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${t.padEnd(30)} ${c}`);
}

db.close();
