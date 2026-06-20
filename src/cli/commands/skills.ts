import { skillLoad, skillList } from "../../tools/skill.js";
import { getFlag, hasFlag, args } from "./utils.js";

export function cmdSkills() {
  if (hasFlag("list") || args.length === 1) {
    const stackFilter = getFlag("stack");
    const { skills } = skillList(stackFilter);

    console.log("\n=== Available Skills ===\n");
    for (const skill of skills) {
      console.log(`  ${skill.name} (v${skill.version || "?"})`);
      if (skill.description) console.log(`    ${skill.description}`);
      console.log(`    applies_to: ${skill.applies_to.join(", ")}`);
      console.log("");
    }
    return;
  }

  const showName = getFlag("show");
  if (showName) {
    const result = skillLoad(showName);
    if ("error" in result) {
      console.error(`  ✗ ${result.error}`);
      process.exit(1);
    }
    console.log(result.content);
    return;
  }
}
