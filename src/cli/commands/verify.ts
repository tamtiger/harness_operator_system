import { resolve } from "node:path";
import { verifyRun } from "../../tools/verify.js";
import { getFlag, hasFlag } from "./utils.js";

export async function cmdVerify() {
  const repoPath = resolve(getFlag("repo") || ".");
  const skipInstall = hasFlag("skip-install");
  const forceInstall = hasFlag("force-install");

  console.log(`\n=== harness verify: ${repoPath} ===\n`);

  const skipSteps = skipInstall ? ["install"] : [];

  const result = await verifyRun(repoPath, {
    force_install: forceInstall,
    skip_steps: skipSteps,
  });

  console.log(`  Steps run: ${result.steps_run.join(", ")}`);
  console.log(`  Result: ${result.passed ? "✅ PASSED" : "❌ FAILED"}`);

  if (!result.passed) {
    console.log(`\n  Output:\n${result.output}`);
    process.exit(1);
  }
}
