import { resolve } from "node:path";
import { sessionStart } from "../../tools/session.js";
import { getFlag } from "./utils.js";

export function cmdQuickStart() {
  const repoPath = resolve(getFlag("repo") || ".");
  const title = getFlag("title") || "Quick modification";

  console.log(`\n=== harness quick-start: ${repoPath} ===\n`);

  try {
    const result = sessionStart(repoPath, { quick: true, quick_task_title: title });
    console.log(`  ✓ Session started: ${result.session_id}`);
    if (result.quick_task_id) {
      console.log(`  ✓ Task created: ${title} (${result.quick_task_id.slice(0, 8)})`);
      console.log(`  ✓ Scope set to '*'`);
    }
    console.log(`\n  Ready for quick modifications! Run 'harness verify' when done.\n`);
  } catch (err: any) {
    console.error(`  ✗ Failed to start quick session: ${err.message}`);
    process.exit(1);
  }
}
