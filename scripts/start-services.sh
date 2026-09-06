#!/bin/bash
# start-services.sh
#
# Start semua service yang dibutuhkan: dev server + scheduler daemon.
# Aman dijalankan ulang (idempotent) — kalau service sudah jalan, skip.
#
# Usage: bash scripts/start-services.sh

set -e

PROJECT_DIR="/home/z/my-project"
cd "$PROJECT_DIR"

# --- Helper ---
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

start_if_not_running() {
  local pattern="$1"
  local start_cmd="$2"
  local name="$3"

  if pgrep -f "$pattern" > /dev/null 2>&1; then
    log "✓ $name already running (PID: $(pgrep -f "$pattern" | head -1))"
  else
    log "→ Starting $name ..."
    eval "$start_cmd"
    sleep 3
    if pgrep -f "$pattern" > /dev/null 2>&1; then
      log "✓ $name started (PID: $(pgrep -f "$pattern" | head -1))"
    else
      log "✗ $name failed to start"
    fi
  fi
}

# --- 1. Dev Server (Next.js) ---
start_if_not_running \
  "next-server" \
  "nohup setsid -f bash -c 'cd $PROJECT_DIR && exec bun run dev > dev.log 2>&1' < /dev/null > /dev/null 2>&1 &" \
  "Dev Server (Next.js)"

# --- 2. Scheduler (auto-backup daemon) ---
start_if_not_running \
  "bun scripts/scheduler.js" \
  "nohup setsid -f bash -c 'cd $PROJECT_DIR && exec bun scripts/scheduler.js' < /dev/null > /dev/null 2>&1 &" \
  "Scheduler Daemon"

# --- 3. Summary ---
log ""
log "=== SERVICES STATUS ==="
log "Dev Server:  $(pgrep -af next-server | head -1 || echo 'NOT RUNNING')"
log "Scheduler:   $(pgrep -af 'bun scripts/scheduler.js' | head -1 || echo 'NOT RUNNING')"
log ""
log "Logs:"
log "  Dev Server:  tail -f $PROJECT_DIR/dev.log"
log "  Scheduler:   tail -f $PROJECT_DIR/scheduler.log"
log ""
log "Stop services:"
log "  pkill -f next-server"
log "  pkill -f 'bun scripts/scheduler.js'"
