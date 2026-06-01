import { existsSync, writeFileSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { verifyRun } from "../tools/verify.js";
import { sessionStart, sessionHandoff } from "../tools/session.js";
import { taskCreate, taskUpdate } from "../tools/task.js";
import { log } from "../lib/logger.js";

export interface OrchestrateOptions {
  repoPath: string;
  maxLoops: number;
  steps?: string[];
  timeoutPerLoop?: number;      // seconds, default 300
  failFastPatterns?: string[];  // regex patterns that trigger immediate stop
}

export interface OrchestrateResult {
  success: boolean;
  loops_run: number;
  message: string;
  exit_code: 0 | 1 | 2 | 3;  // 0=success, 1=max loops, 2=timeout, 3=fail-fast
  error?: string;
}

/**
 * Run a Ralph Loop automation with timeout and fail-fast patterns:
 * Starts a session, creates/runs tasks, verifies them in a loop,
 * and retries if failures occur, up to maxLoops.
 */
export async function runOrchestrate(
  taskTitle: string,
  options: OrchestrateOptions
): Promise<OrchestrateResult> {
  const repoPath = resolve(options.repoPath);
  const maxLoops = options.maxLoops || 3;
  const timeoutPerLoop = (options.timeoutPerLoop || 300) * 1000; // convert to ms
  const failFastPatterns = options.failFastPatterns || [
    "ENOSPC", "EACCES", "Cannot find module", "Command failed", "ECONNREFUSED"
  ];
  
  let loops = 0;
  let done = false;
  let lastError = "";
  let exitCode: 0 | 1 | 2 | 3 = 1; // default to max loops

  log("info", `Starting Ralph Loop orchestrator for task: "${taskTitle}"`, { 
    maxLoops, 
    repoPath,
    timeoutPerLoop: timeoutPerLoop / 1000,
    failFastPatterns 
  });

  // 1. Start the first session
  const session = sessionStart(repoPath);
  log("info", `Orchestrator session initialized`, { sessionId: session.session_id });

  // 2. Create the task
  const task = taskCreate(taskTitle, undefined, session.session_id);
  const taskId = task.task_id;
  taskUpdate(taskId, "in-progress");

  // Ralph Loop
  while (loops < maxLoops && !done) {
    loops++;
    log("info", `Executing Loop iteration ${loops}/${maxLoops}...`);

    // Run verification pipeline with timeout
    let verifyResult;
    try {
      verifyResult = await awaitWithTimeout(
        async () => verifyRun(repoPath, { steps: options.steps, task_id: taskId }),
        timeoutPerLoop,
        `Verification timeout after ${timeoutPerLoop / 1000}s`
      );
    } catch (timeoutError) {
      log("error", `Loop iteration ${loops} TIMEOUT: ${timeoutError}`);
      taskUpdate(taskId, "blocked");
      sessionHandoff(session.session_id, `Orchestrator timeout for task "${taskTitle}" after ${loops} loops`, 
        [`Timeout after ${timeoutPerLoop / 1000}s`], 
        ["Check for infinite loops or resource constraints"]
      );
      return {
        success: false,
        loops_run: loops,
        message: `Orchestrator timeout after ${timeoutPerLoop / 1000}s per loop.`,
        exit_code: 2,
        error: String(timeoutError)
      };
    }

    // Check for fail-fast patterns in output
    const outputStr = verifyResult.output.toLowerCase();
    for (const pattern of failFastPatterns) {
      if (outputStr.includes(pattern.toLowerCase())) {
        log("error", `Fail-fast pattern matched: "${pattern}" in output`);
        taskUpdate(taskId, "blocked");
        sessionHandoff(session.session_id, `Orchestrator fail-fast for task "${taskTitle}"`, 
          [`Fail-fast pattern matched: ${pattern}`], 
          ["Investigate infrastructure or dependency issue"]
        );
        return {
          success: false,
          loops_run: loops,
          message: `Fail-fast pattern matched: ${pattern}`,
          exit_code: 3,
          error: `Pattern "${pattern}" found in verification output`
        };
      }
    }

    if (verifyResult.passed) {
      log("info", `Loop iteration ${loops} PASSED all verification checks.`);
      done = true;
      taskUpdate(taskId, "done");
      
      // Write a done signal file
      const doneFile = join(repoPath, "done.txt");
      writeFileSync(doneFile, `Task "${taskTitle}" completed successfully after ${loops} loops.\nTimestamp: ${new Date().toISOString()}`, "utf-8");
      
      // Hand off and end session successfully
      sessionHandoff(session.session_id, `Completed task "${taskTitle}" via orchestrator Ralph Loop`, [], [], {
        passed: true,
        steps_run: verifyResult.steps_run
      });
      
      return {
        success: true,
        loops_run: loops,
        message: `Task successfully completed and validated after ${loops} iterations.`,
        exit_code: 0
      };
    } else {
      const failedStep = verifyResult.step_results.find((r: any) => !r.passed)?.name || "unknown";
      lastError = `Verification failed at step: ${failedStep}`;
      log("warn", `Loop iteration ${loops} FAILED. ${lastError}`);
      
      // Simulating a self-healing phase: in real workflow, this triggers a subagent coder
      // Here we log the failure so the system/agent can inspect.
    }
  }

  // If we reach here, we hit max loops without passing verification
  taskUpdate(taskId, "blocked");
  sessionHandoff(session.session_id, `Orchestrator failed to complete task "${taskTitle}" after ${loops} loops`, 
    [lastError], 
    ["Investigate verification failure logs"]
  );

  return {
    success: false,
    loops_run: loops,
    message: `Orchestrator failed to complete task after reaching maximum loop count (${maxLoops}).`,
    exit_code: 1,
    error: lastError
  };
}

/**
 * Helper to run a promise with timeout
 */
function awaitWithTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  timeoutMessage: string
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);

    fn()
      .then(resolve)
      .catch(reject)
      .finally(() => clearTimeout(timer));
  });
}
