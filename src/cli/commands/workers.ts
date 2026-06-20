import { resolve } from "node:path";
import { listWorkers, killWorker, cleanupExpiredWorkers } from "../../lib/worker-registry.js";
import { getFlag, hasFlag } from "./utils.js";

export function cmdWorkers() {
  const killFlag = getFlag("kill");
  const cleanupFlag = hasFlag("cleanup");

  if (killFlag) {
    console.log(`\nKilling worker: ${killFlag}`);
    const success = killWorker(killFlag);
    if (success) {
      console.log(`  ✓ Worker ${killFlag} killed successfully.\n`);
      process.exit(0);
    } else {
      console.error(`  ✗ Worker ${killFlag} not found or not running.\n`);
      process.exit(1);
    }
  }

  if (cleanupFlag) {
    console.log(`\nCleaning up expired workers...`);
    const count = cleanupExpiredWorkers();
    console.log(`  ✓ Cleaned up ${count} expired worker(s).\n`);
    process.exit(0);
  }

  // Default: list workers
  const repoPath = getFlag("repo");
  const status = getFlag("status") || "running";

  const workers = listWorkers({
    repoPath: repoPath ? resolve(repoPath) : undefined,
    status: status === "all" ? undefined : status,
  });

  console.log("\n=== Subagent Workers ===\n");
  if (workers.length === 0) {
    console.log("  (no workers found)\n");
    return;
  }

  for (const w of workers) {
    console.log(`  Worker ID:  ${w.worker_id}`);
    console.log(`  PID:        ${w.pid || "N/A"}`);
    console.log(`  Status:     ${w.status}`);
    console.log(`  Command:    ${w.command}`);
    console.log(`  Timeout At: ${w.timeout_at}`);
    console.log("");
  }
}
