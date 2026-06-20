import { instinctGet } from "../../tools/instinct.js";
import { getDb } from "../../db/client.js";
import { getFlag, hasFlag, args } from "./utils.js";

export function cmdInstincts() {
  if (hasFlag("list") || args.length === 1) {
    const { instincts } = instinctGet();
    console.log("\n=== Instincts ===\n");
    if (instincts.length === 0) {
      console.log("  (no instincts)");
      return;
    }
    for (const inst of instincts) {
      console.log(`  [${inst.confidence.toFixed(1)}] ${inst.description}`);
      console.log(`    tags: ${inst.tags.join(", ")}`);
      console.log("");
    }
    return;
  }

  if (hasFlag("export")) {
    const format = getFlag("format");
    if (format === "jsonl") {
      const db = getDb();
      const outcomes = db.prepare(`
        SELECT instinct_id, task_type, variant_id, outcome, scorecard_id, timestamp
        FROM instinct_outcomes
      `).all() as Array<{
        instinct_id: string;
        task_type: string;
        variant_id: string;
        outcome: string;
        scorecard_id: string;
        timestamp: string;
      }>;
      for (const o of outcomes) {
        console.log(JSON.stringify({
          schema_version: "1.0",
          instinct_id: o.instinct_id,
          task_type: o.task_type,
          variant_id: o.variant_id,
          outcome: o.outcome,
          scorecard_id: o.scorecard_id,
          timestamp: o.timestamp
        }));
      }
      return;
    }

    const { instincts } = instinctGet();
    console.log(JSON.stringify(instincts, null, 2));
    return;
  }
}
