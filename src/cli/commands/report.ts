import { generateReport } from "../../lib/analytics.js";
import { getFlag } from "./utils.js";

export function cmdReport() {
  const period = (getFlag("period") || "7d") as "7d" | "30d" | "all";
  const repoPath = getFlag("repo");
  const format = getFlag("format") || "table";

  const report = generateReport({ period, repoPath });

  if (format === "json") {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log(`\n=== Reliability Report (Period: ${report.period}) ===\n`);
  console.log(`Reliability Score: ${report.reliability_score.toFixed(3)}\n`);

  console.log("A. Tool Usage");
  console.log("-----------------------------------------------------------------");
  console.log("Tool                           Calls     Success    Error  Blocked");
  console.log("-----------------------------------------------------------------");
  if (report.tool_usage.length === 0) {
    console.log("  (no data)");
  } else {
    for (const tu of report.tool_usage) {
      console.log(
        `${tu.tool.padEnd(28)}  ${tu.calls.toString().padStart(6)}  ${tu.success.toString().padStart(10)}  ${tu.error.toString().padStart(7)}  ${tu.blocked.toString().padStart(7)}`
      );
    }
  }
  console.log("-----------------------------------------------------------------\n");

  console.log("B. Tool Latency");
  console.log("----------------------------------");
  console.log("Tool                           P50    P95");
  console.log("----------------------------------");
  if (report.tool_latency.length === 0) {
    console.log("  (no data)");
  } else {
    for (const tl of report.tool_latency) {
      console.log(`${tl.tool.padEnd(28)}  ${tl.p50.toFixed(2).padStart(4)}s  ${tl.p95.toFixed(2).padStart(4)}s`);
    }
  }
  console.log("----------------------------------\n");

  console.log("C. Skill Effectiveness");
  console.log("-------------------------------------------------------------");
  console.log("Skill                           Loaded   Sessions Passed  Rate");
  console.log("-------------------------------------------------------------");
  if (report.skill_effectiveness.length === 0) {
    console.log("  (no data)");
  } else {
    for (const se of report.skill_effectiveness) {
      console.log(
        `${se.skill.padEnd(30)}  ${se.loaded.toString().padStart(6)}  ${se.sessions_passed.toString().padStart(15)}  ${se.rate.toString().padStart(3)}%`
      );
    }
  }
  console.log("-------------------------------------------------------------\n");
}
