import { runOrchestrate } from "../orchestrator.js";
import { getFlag, args } from "./utils.js";

export async function cmdOrchestrate() {
  const title = args[1] || "Automated Orchestrated Task";
  const repo = getFlag("repo") || ".";
  const maxLoops = parseInt(getFlag("max-loops") || "3", 10);
  const stepsFlag = getFlag("steps");
  const steps = stepsFlag ? stepsFlag.split(",").map(s => s.trim()) : undefined;
  const timeoutPerLoop = parseInt(getFlag("timeout-per-loop") || "300", 10);
  const failFastOnFlag = getFlag("fail-fast-on");
  const failFastPatterns = failFastOnFlag ? failFastOnFlag.split(",").map(s => s.trim()) : undefined;

  const result = await runOrchestrate(title, {
    repoPath: repo,
    maxLoops,
    steps,
    timeoutPerLoop,
    failFastPatterns
  });

  // Map exit codes to messages
  const exitMessages: Record<number, string> = {
    0: "Success",
    1: "Max loops reached",
    2: "Timeout per loop exceeded",
    3: "Fail-fast pattern matched"
  };

  if (result.success) {
    process.stdout.write(`Success: ${result.message}\n`);
    process.exit(0);
  } else {
    const exitMsg = exitMessages[result.exit_code] || "Unknown error";
    process.stderr.write(`Failure (${exitMsg}): ${result.message} (Error: ${result.error})\n`);
    process.exit(result.exit_code);
  }
}
