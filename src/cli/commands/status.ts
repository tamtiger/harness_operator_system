import { resolve } from "node:path";
import { harnessStatus } from "../../tools/observe.js";
import { getFlag } from "./utils.js";

export function cmdStatus() {
  const repoPath = getFlag("repo") || ".";
  const format = getFlag("format") || "table";

  const status = harnessStatus(resolve(repoPath));

  if (format === "json") {
    console.log(JSON.stringify(status, null, 2));
    return;
  }

  console.log("\n=== harness status ===\n");

  if (status.active_session) {
    console.log(`  Session: ${status.active_session.id}`);
    console.log(`  Repo:    ${status.active_session.repo_path}`);
    console.log(`  Started: ${status.active_session.started_at}`);
  } else {
    console.log("  Session: (none active)");
  }

  console.log(`  Pending tasks: ${status.pending_tasks}`);
  console.log(`  Last verify:   ${status.last_verify || "(never)"}`);

  if (status.recent_instincts.length > 0) {
    console.log(`  Recent instincts:`);
    for (const inst of status.recent_instincts.slice(0, 3)) {
      console.log(`    - ${inst.description}`);
    }
  }
  console.log("");
}
