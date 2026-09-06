/**
 * auto-backup.js
 *
 * Usage: bun scripts/auto-backup.js [commit-message]
 *
 * Script automation untuk backup data + push ke GitHub setelah perubahan besar.
 *
 * Apa yang dilakukan:
 *   1. Jalankan scripts/dump-database.js → regenerate db/dump.sql
 *   2. git add db/dump.sql db/custom.db prisma/schema.prisma (kalau berubah)
 *   3. git add semua perubahan staged lainnya
 *   4. git commit dengan pesan (default: "backup: auto-checkpoint <timestamp>")
 *   5. git push ke branch GH_BRANCH_BACKUP di origin (pakai GH_TOKEN)
 *   6. Juga push ke branch aktif saat ini
 *
 * Token dibaca dari .env.local (GH_TOKEN, GH_REPO, GH_BRANCH_BACKUP).
 *
 * Cara pakai:
 *   - Setelah perubahan besar: bun scripts/auto-backup.js "feat: tambah modul X"
 *   - Default message: bun scripts/auto-backup.js
 *
 * IDempotent: kalau tidak ada perubahan, skip commit tapi tetap push (memastikan remote sync).
 */

import { execSync, spawnSync } from "child_process";
import { readFileSync, existsSync, writeFileSync } from "fs";
import { join } from "path";
import { Database } from "bun:sqlite";

// --- Load .env.local manually (Bun auto-load, but be explicit) ---
const envLocalPath = join(import.meta.dir, "..", ".env.local");
if (existsSync(envLocalPath)) {
  const content = readFileSync(envLocalPath, "utf8");
  for (const line of content.split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].trim();
    }
  }
}

const GH_TOKEN = process.env.GH_TOKEN;
const GH_REPO = process.env.GH_REPO || "hijau-daun-dev/sekolah";
const GH_BRANCH_BACKUP = process.env.GH_BRANCH_BACKUP || "backup/auto-checkpoint";

if (!GH_TOKEN) {
  console.error("❌ GH_TOKEN tidak ditemukan di .env.local");
  console.error("   Buat file .env.local dengan baris: GH_TOKEN=ghp_xxxxx");
  process.exit(1);
}

// --- helpers ---
function run(cmd, opts = {}) {
  return execSync(cmd, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], ...opts }).toString().trim();
}

function git(args, opts = {}) {
  const result = spawnSync("git", args, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], ...opts });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed:\n${result.stderr || result.stdout}`);
  }
  return result.stdout.toString().trim();
}

function gitOk(args) {
  const result = spawnSync("git", args, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
  return result.status === 0;
}

// --- Step 1: Dump database ---
function dumpDatabase() {
  console.log("📦 Step 1: Dump database ke db/dump.sql ...");
  const DB_PATH = join(import.meta.dir, "..", "db", "custom.db");
  const DUMP_PATH = join(import.meta.dir, "..", "db", "dump.sql");

  if (!existsSync(DB_PATH)) {
    console.warn(`   ⚠️  ${DB_PATH} tidak ditemukan, skip dump`);
    return { tables: 0, rows: 0, size: 0 };
  }

  const db = new Database(DB_PATH, { readonly: true });
  const tables = db
    .query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma_%' ORDER BY name")
    .all()
    .map((r) => r.name);

  let sql = `-- Database dump for SIMSEKOLAH\n-- Generated: ${new Date().toISOString()}\n-- Source: db/custom.db (SQLite)\n-- Tables: ${tables.length}\n\nPRAGMA foreign_keys=OFF;\nBEGIN TRANSACTION;\n\n`;
  let totalRows = 0;

  for (const table of tables) {
    const cols = db.query(`PRAGMA table_info("${table}")`).all();
    const colNames = cols.map((c) => `"${c.name}"`);
    const rowCount = db.query(`SELECT COUNT(*) as cnt FROM "${table}"`).get().cnt;
    totalRows += rowCount;

    sql += `-- Table: ${table} (${rowCount} rows)\nDELETE FROM "${table}";\n`;
    if (rowCount === 0) {
      sql += "\n";
      continue;
    }
    const rows = db.query(`SELECT ${colNames.join(", ")} FROM "${table}"`).all();
    for (const row of rows) {
      const values = cols.map((c) => {
        const v = row[c.name];
        if (v === null || v === undefined) return "NULL";
        if (typeof v === "number") return String(v);
        if (typeof v === "bigint") return v.toString();
        if (typeof v === "boolean") return v ? "1" : "0";
        if (v instanceof Uint8Array) {
          const hex = Array.from(v).map((b) => b.toString(16).padStart(2, "0")).join("");
          return "X'" + hex + "'";
        }
        return "'" + String(v).replace(/'/g, "''") + "'";
      });
      sql += `INSERT INTO "${table}" (${colNames.join(", ")}) VALUES (${values.join(", ")});\n`;
    }
    sql += "\n";
  }
  sql += "COMMIT;\nPRAGMA foreign_keys=ON;\n";
  db.close();

  writeFileSync(DUMP_PATH, sql, "utf8");
  const size = require("fs").statSync(DUMP_PATH).size;
  console.log(`   ✓ ${tables.length} tables, ${totalRows} rows, ${(size / 1024).toFixed(1)} KB → ${DUMP_PATH}`);
  return { tables: tables.length, rows: totalRows, size };
}

// --- Step 2: Git operations ---
function gitOps(message) {
  console.log("📝 Step 2: Git add + commit ...");
  // Stage database-related files explicitly
  git(["add", "db/dump.sql"], {});
  git(["add", "db/custom.db"], {}); // binary, only commit if changed
  git(["add", "prisma/schema.prisma"], {});
  // Stage everything else (new files, modified files, deletions)
  git(["add", "-A"], {});

  // Check if there's anything to commit
  const status = git(["status", "--porcelain"]);
  if (!status) {
    console.log("   ℹ️  Tidak ada perubahan untuk di-commit");
    return false;
  }

  // Get current branch
  const currentBranch = git(["rev-parse", "--abbrev-ref", "HEAD"]);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const fullMessage = message || `backup: auto-checkpoint ${timestamp}`;
  git(["commit", "-m", fullMessage], {});
  console.log(`   ✓ Commit: ${fullMessage}`);
  console.log(`   ✓ Branch: ${currentBranch}`);
  return true;
}

// --- Step 3: Push to remote ---
function pushToRemote() {
  console.log("🚀 Step 3: Push ke remote ...");
  const remoteUrl = `https://x-access-token:${GH_TOKEN}@github.com/${GH_REPO}.git`;
  const currentBranch = git(["rev-parse", "--abbrev-ref", "HEAD"]);

  // Push current branch
  console.log(`   → Push branch ${currentBranch} ...`);
  try {
    const pushResult = spawnSync("git", ["push", remoteUrl, currentBranch], { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
    if (pushResult.status !== 0) {
      console.error(`   ❌ Push ${currentBranch} gagal:`, pushResult.stderr);
      return false;
    }
    console.log(`   ✓ ${currentBranch} pushed`);
  } catch (e) {
    console.error(`   ❌ Push ${currentBranch} gagal:`, e.message);
    return false;
  }

  // Push to backup branch (force-update to mirror current)
  if (currentBranch !== GH_BRANCH_BACKUP) {
    console.log(`   → Push ke backup branch ${GH_BRANCH_BACKUP} ...`);
    // Update local backup branch to match current
    if (gitOk(["rev-parse", "--verify", GH_BRANCH_BACKUP])) {
      git(["checkout", GH_BRANCH_BACKUP]);
      git(["reset", "--hard", currentBranch]);
    } else {
      git(["branch", GH_BRANCH_BACKUP, currentBranch]);
      git(["checkout", GH_BRANCH_BACKUP]);
    }
    const pushBackupResult = spawnSync("git", ["push", "-f", remoteUrl, GH_BRANCH_BACKUP], { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
    if (pushBackupResult.status !== 0) {
      console.warn(`   ⚠️  Push backup branch gagal:`, pushBackupResult.stderr);
    } else {
      console.log(`   ✓ ${GH_BRANCH_BACKUP} pushed (force-updated to mirror ${currentBranch})`);
    }
    // Switch back to original branch
    git(["checkout", currentBranch]);
  }

  return true;
}

// --- MAIN ---
async function main() {
  console.log("=== auto-backup.js START ===");
  console.log(`Repo: ${GH_REPO}`);
  console.log(`Backup branch: ${GH_BRANCH_BACKUP}`);
  console.log(`Time: ${new Date().toISOString()}\n`);

  const message = process.argv[2];

  try {
    // Pre-check: clean working tree? (just informational)
    const preStatus = git(["status", "--porcelain"]);
    if (preStatus) {
      console.log(`ℹ️  Perubahan terdeteksi sebelum backup:\n${preStatus}\n`);
    }

    dumpDatabase();
    const committed = gitOps(message);
    pushToRemote();

    console.log("\n=== auto-backup.js DONE ===");
    console.log("✅ Backup checkpoint berhasil!");
    if (committed) {
      console.log("   - db/dump.sql di-regenerate dan di-commit");
      console.log("   - Semua perubahan staged lainnya juga di-commit");
    }
    console.log("   - Push ke remote branch aktif + backup/auto-checkpoint");
    console.log(`\n🔗 Lihat di: https://github.com/${GH_REPO}/tree/${GH_BRANCH_BACKUP}`);
  } catch (e) {
    console.error("\n❌ FATAL:", e.message);
    process.exit(1);
  }
}

main();
