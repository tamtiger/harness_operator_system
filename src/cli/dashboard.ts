import { getDb } from "../db/client.js";
import { log } from "../lib/logger.js";
import { complianceCheck } from "../tools/compliance.js";

export function runDashboard(repoPath?: string) {
  const db = getDb();

  // If repoPath is provided, filter by it, otherwise global
  const repoFilter = repoPath ? "WHERE repo_path = ?" : "";
  const params = repoPath ? [repoPath] : [];

  const sessionsQuery = `SELECT id, verify_passed, current_phase FROM sessions ${repoFilter}`;
  const sessions = db.prepare(sessionsQuery).all(...params) as any[];

  if (sessions.length === 0) {
    console.log("No sessions found.");
    return;
  }

  const totalSessions = sessions.length;
  let verifyPassedCount = 0;
  let handoffCount = 0;
  let compliancePassCount = 0;
  
  for (const s of sessions) {
    if (s.verify_passed) verifyPassedCount++;
    if (s.current_phase === 'WRAP_UP') handoffCount++;

    try {
      const comp = complianceCheck(s.id);
      if (comp.status === 'PASS') {
        compliancePassCount++;
      }
    } catch (e) {
      // ignore
    }
  }

  const complianceRate = totalSessions > 0 ? (compliancePassCount / totalSessions) * 100 : 0;
  const verificationRate = (verifyPassedCount / totalSessions) * 100;
  const handoffRate = (handoffCount / totalSessions) * 100;

  console.log("=== Harness-OS Observability Dashboard ===");
  if (repoPath) {
    console.log(`Repository: ${repoPath}`);
  } else {
    console.log(`Scope: Global`);
  }
  console.log("------------------------------------------");
  console.log(`Total Sessions:        ${totalSessions}`);
  console.log(`Compliance Rate:       ${complianceRate.toFixed(1)}% (${compliancePassCount}/${totalSessions})`);
  console.log(`Verification Rate:     ${verificationRate.toFixed(1)}% (${verifyPassedCount}/${totalSessions})`);
  console.log(`Handoff Rate:          ${handoffRate.toFixed(1)}% (${handoffCount}/${totalSessions})`);
  console.log("==========================================");
}
