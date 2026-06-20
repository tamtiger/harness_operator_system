import { resolve, dirname } from "node:path";
import { writeFileSync } from "node:fs";
import { ensureDir } from "../../lib/repo.js";
import { generateTree } from "../../lib/tree.js";
import { getFlag } from "./utils.js";

export function cmdTree() {
  const path = resolve(getFlag("path") || ".");
  const depth = parseInt(getFlag("depth") || "4", 10);
  const excludeArg = getFlag("exclude");
  const output = getFlag("output");

  const exclude = excludeArg ? excludeArg.split(",").map((s) => s.trim()) : undefined;

  const tree = generateTree({ path, depth, exclude });

  if (output) {
    ensureDir(dirname(resolve(output)));
    writeFileSync(resolve(output), tree, "utf-8");
    console.log(`✓ Tree written to ${output}`);
  } else {
    console.log(tree);
  }
}
