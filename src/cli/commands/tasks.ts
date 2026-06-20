import { resolve } from "node:path";
import { taskList } from "../../tools/task.js";
import { getFlag } from "./utils.js";

export function cmdTasks() {
  const repoPath = getFlag("repo");
  const status = getFlag("status");

  const { tasks } = taskList(repoPath ? resolve(repoPath) : undefined, status);

  console.log("\n=== Tasks ===\n");
  if (tasks.length === 0) {
    console.log("  (no tasks found)");
    return;
  }

  for (const task of tasks) {
    const statusIcon = task.status === "done" ? "✓" : task.status === "in-progress" ? "→" : "○";
    console.log(`  ${statusIcon} [${task.status}] ${task.title} (${task.id.slice(0, 8)})`);
  }
  console.log("");
}
