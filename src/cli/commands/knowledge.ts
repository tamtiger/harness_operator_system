import { instinctAdd, instinctGet } from "../../tools/instinct.js";
import { getFlag, hasFlag, args } from "./utils.js";

export function cmdKnowledge() {
  const listFlag = hasFlag("list") || args.length === 1;
  const addFlag = hasFlag("add");
  const typeFlag = getFlag("type");
  const tagsFlag = getFlag("tags");

  const types = typeFlag ? typeFlag.split(",").map(t => t.trim()) : undefined;
  const tags = tagsFlag ? tagsFlag.split(",").map(t => t.trim()) : undefined;

  if (addFlag) {
    const descParts: string[] = [];
    for (let i = 1; i < args.length; i++) {
      const arg = args[i];
      if (arg === "--add" || arg === "--list") {
        continue;
      }
      if (arg === "--type" || arg === "--tags") {
        i++; // Skip flag and its value
        continue;
      }
      if (arg.startsWith("--")) {
        continue;
      }
      descParts.push(arg);
    }
    const description = descParts.join(" ");
    if (!description) {
      console.error("  ✗ Usage: harness knowledge --add --type <type> <description> [--tags <tags>]");
      process.exit(1);
    }
    const { id } = instinctAdd(
      description,
      tags || [],
      0.9,
      undefined,
      typeFlag as any || "instinct"
    );
    console.log(`\n✓ Added knowledge (ID: ${id.slice(0, 8)})\n`);
    return;
  }

  if (listFlag) {
    const { instincts } = instinctGet(tags, undefined, undefined, types);
    console.log("\n=== Knowledge Items ===\n");
    if (instincts.length === 0) {
      console.log("  (no knowledge found)");
      return;
    }
    for (const item of instincts) {
      console.log(`  [${item.type}] [${item.confidence.toFixed(1)}] ${item.description}`);
      console.log(`    tags: ${item.tags.join(", ")}`);
      if (item.resolution) console.log(`    resolution: ${item.resolution}`);
      console.log("");
    }
    return;
  }
}
