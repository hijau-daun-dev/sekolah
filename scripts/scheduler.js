/**
 * scheduler.js
 *
 * Usage: bun scripts/scheduler.js
 *
 * Daemon scheduler yang jalan terus-menerus di background.
 * Menjalankan auto-backup.js secara periodik untuk mencegah kehilangan data.
 *
 * Schedule default (dapat di-override via .env.local):
 *   - BACKUP_INTERVAL_HOURS=6  → backup setiap 6 jam
 *   - BACKUP_ON_START=true     → backup sekali saat scheduler start
 *
 * Cara start sebagai daemon:
 *   nohup setsid -f bash -c 'cd /home/z/my-project && exec bun scripts/scheduler.js > scheduler.log 2>&1' &
 *
 * Cara cek status:
 *   pgrep -af scheduler
 *   tail -50 scheduler.log
 *
 * Cara stop:
 *   pkill -f "bun scripts/scheduler.js"
 *
 * File log: scheduler.log (auto-rotate jika > 10 MB)
 */

import { Cron } from "croner";
import { readFileSync, existsSync, writeFileSync, statSync, renameSync } from "fs";
import { join } from "path";
import { spawnSync } from "child_process";

// --- Load .env.local ---
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

const BACKUP_INTERVAL_HOURS = parseInt(process.env.BACKUP_INTERVAL_HOURS || "6", 10);
const BACKUP_ON_START = (process.env.BACKUP_ON_START || "true") === "true";
const SCHEDULER_LOG = join(import.meta.dir, "..", "scheduler.log");

// --- Log helper with rotation ---
function log(message) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}\n`;

  // Rotate if > 10 MB
  try {
    if (existsSync(SCHEDULER_LOG)) {
      const stats = statSync(SCHEDULER_LOG);
      if (stats.size > 10 * 1024 * 1024) {
        renameSync(SCHEDULER_LOG, SCHEDULER_LOG + ".old");
      }
    }
  } catch (e) {
    // ignore rotation errors
  }

  writeFileSync(SCHEDULER_LOG, line, { flag: "a" });
  console.log(line.trim());
}

// --- Run auto-backup ---
function runBackup(reason = "scheduled") {
  log(`▶️  Starting backup (${reason})...`);
  const start = Date.now();

  const result = spawnSync("bun", ["scripts/auto-backup.js", `backup: ${reason} checkpoint`], {
    cwd: join(import.meta.dir, ".."),
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
    timeout: 5 * 60 * 1000, // 5 min timeout
  });

  const duration = ((Date.now() - start) / 1000).toFixed(1);

  if (result.status === 0) {
    log(`✅ Backup completed in ${duration}s (${reason})`);
    log(`   stdout: ${result.stdout.trim().split("\n").pop()}`);
  } else {
    log(`❌ Backup FAILED in ${duration}s (${reason})`);
    log(`   stderr: ${result.stderr?.trim() || "unknown error"}`);
    log(`   stdout: ${result.stdout?.trim() || ""}`);
  }
}

// --- MAIN ---
function main() {
  log("=== SCHEDULER STARTED ===");
  log(`Backup interval: every ${BACKUP_INTERVAL_HOURS} hour(s)`);
  log(`Backup on start: ${BACKUP_ON_START}`);
  log(`Log file: ${SCHEDULER_LOG}`);
  log(`PID: ${process.pid}`);

  // Backup sekali saat start (jika di-enable)
  if (BACKUP_ON_START) {
    runBackup("on-start");
  }

  // Schedule: setiap BACKUP_INTERVAL_HOURS jam, pada menit 0
  // Cron pattern: 0 */N * * * = setiap N jam pada menit 0
  const cronPattern = `0 */${BACKUP_INTERVAL_HOURS} * * *`;
  log(`Scheduling cron: ${cronPattern}`);

  const job = new Cron(cronPattern, () => {
    runBackup("scheduled");
  });

  // Juga backup setiap hari pada 23:59 (end-of-day checkpoint)
  const dailyJob = new Cron("59 23 * * *", () => {
    runBackup("end-of-day");
  });
  log(`Scheduling daily end-of-day: 59 23 * * *`);

  // Keep process alive
  log("Scheduler is running. Press Ctrl+C to stop.");

  // Handle graceful shutdown
  const shutdown = (signal) => {
    log(`Received ${signal}, shutting down...`);
    job.stop();
    dailyJob.stop();
    log("Scheduler stopped.");
    process.exit(0);
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGHUP", () => shutdown("SIGHUP"));

  // Heartbeat setiap 1 jam untuk verifikasi scheduler masih hidup
  setInterval(() => {
    log(`💓 Heartbeat — scheduler alive (uptime: ${Math.floor(process.uptime() / 60)} min)`);
  }, 60 * 60 * 1000);
}

main();
