import { getDb } from "../../db/client.js";
import { hasFlag, args } from "./utils.js";

export function cmdVariants() {
  const benchmarkFlag = hasFlag("benchmark") || args.length === 1;

  if (benchmarkFlag) {
    const db = getDb();
    
    const stats = db.prepare(`
      SELECT 
        variant_id,
        COUNT(*) as total_runs,
        SUM(CASE WHEN verify_pass = 1 THEN 1 ELSE 0 END) as passed_runs,
        AVG(tool_calls) as avg_tool_calls,
        AVG(retry_count) as avg_retry_count,
        AVG(execution_time_ms) as avg_time_ms
      FROM scorecards
      GROUP BY variant_id
    `).all() as Array<{
      variant_id: string;
      total_runs: number;
      passed_runs: number;
      avg_tool_calls: number;
      avg_retry_count: number;
      avg_time_ms: number;
    }>;

    console.log("\n=== Variant Benchmarks ===\n");
    if (stats.length === 0) {
      console.log("  (no scorecard data to benchmark)");
      return;
    }

    console.log("----------------------------------------------------------------------------------");
    console.log("Variant         Runs    Pass Rate    Avg Tools    Avg Retries    Avg Duration");
    console.log("----------------------------------------------------------------------------------");
    for (const s of stats) {
      const passRate = s.total_runs > 0 ? (s.passed_runs / s.total_runs) * 100 : 0;
      const durationS = (s.avg_time_ms / 1000).toFixed(1);
      
      console.log(
        `${s.variant_id.padEnd(14)}  ` +
        `${s.total_runs.toString().padStart(4)}    ` +
        `${passRate.toFixed(1).padStart(8)}%    ` +
        `${s.avg_tool_calls.toFixed(1).padStart(9)}    ` +
        `${s.avg_retry_count.toFixed(1).padStart(11)}    ` +
        `${durationS.padStart(11)}s`
      );
    }
    console.log("----------------------------------------------------------------------------------\n");
  }
}
