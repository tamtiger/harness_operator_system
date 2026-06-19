import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const thisFile = fileURLToPath(import.meta.url);
const projectRoot = resolve(dirname(thisFile), "..");

// 1. Read version from package.json (Single Source of Truth)
const packageJsonPath = join(projectRoot, "package.json");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
const version = packageJson.version;

// 2. Count registered MCP tools in src/index.ts
const indexContent = readFileSync(join(projectRoot, "src/index.ts"), "utf-8");
const toolsCount = (indexContent.match(/server\.registerTool\s*\(/g) || []).length;

// 3. Count skills in skills/ directory
const skillsDir = join(projectRoot, "skills");
const skillDirs = readdirSync(skillsDir, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory() && existsSync(join(skillsDir, dirent.name, "SKILL.md")));
const skillsCount = skillDirs.length;

// 4. Count CLI commands in src/cli/harness.ts
const harnessCliContent = readFileSync(join(projectRoot, "src/cli/harness.ts"), "utf-8");
const dispatchMatch = harnessCliContent.match(/switch\s*\(command\)\s*\{([\s\S]*?)default:/);
let cliCommandsCount = 0;
if (dispatchMatch) {
  const switchBody = dispatchMatch[1];
  const caseMatches = switchBody.match(/case\s+["']([a-zA-Z0-9_-]+)["']/g) || [];
  cliCommandsCount = caseMatches.length;
}

// 5. Count unit tests in src/**/*.test.ts
function countTestsInDir(dir: string): number {
  let count = 0;
  if (!existsSync(dir)) return 0;
  const files = readdirSync(dir);
  for (const file of files) {
    const fullPath = join(dir, file);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      count += countTestsInDir(fullPath);
    } else if (file.endsWith(".test.ts")) {
      const content = readFileSync(fullPath, "utf-8");
      // strip comments
      const cleanContent = content.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
      const matches = cleanContent.match(/\b(it|test)\s*\(\s*['"`]/g) || [];
      count += matches.length;
    }
  }
  return count;
}
const testsCount = countTestsInDir(join(projectRoot, "src"));

console.log(`[Version Sync] System stats detected:`);
console.log(`  - Version:       ${version}`);
console.log(`  - MCP Tools:     ${toolsCount}`);
console.log(`  - Skills:        ${skillsCount}`);
console.log(`  - CLI Commands:  ${cliCommandsCount}`);
console.log(`  - Unit Tests:    ${testsCount}`);
console.log(`[Version Sync] Synchronizing statistics across the codebase...`);

const targets = [
  "README.md",
  "AGENTS.md",
  "project-harness-os-overview.md",
  "templates/AGENTS.md.tpl",
  "docs/README.md",
  "docs/01-getting-started.md",
  "docs/02-ide-setup.md",
  "docs/06-cli-reference.md"
];

function replaceStats(content: string): string {
  let updated = content;

  // Replace version
  updated = updated.replace(/version-\d+\.\d+\.\d+-blue/g, `version-${version}-blue`);
  updated = updated.replace(/- \*\*Version:\*\* \d+\.\d+\.\d+/g, `- **Version:** ${version}`);
  updated = updated.replace(/harness-os v\d+\.\d+\.\d+/g, `harness-os v${version}`);
  updated = updated.replace(/\*Tài liệu cập nhật cho harness-os v\d+\.\d+\.\d+\.\*/g, `*Tài liệu cập nhật cho harness-os v${version}.*`);

  // Replace tools — match hardcoded numbers only (avoid over-replacing in code)
  updated = updated.replace(/\b(30|31|32|33|34|35)\s+MCP\s+tools\b/gi, `${toolsCount} MCP tools`);
  updated = updated.replace(/MCP_tools-\d+-blue/g, `MCP_tools-${toolsCount}-blue`);
  updated = updated.replace(/\b(30|31|32|33|34|35)\s+công cụ\b/gi, `${toolsCount} công cụ`);
  // "32 tools" in markdown prose (e.g. "registers 32 tools", "✅ 32 tools")
  updated = updated.replace(/\b(30|31|32|33|34|35)\s+tools\b/gi, `${toolsCount} tools`);

  // Replace skills
  updated = updated.replace(/\b(30|31|32|33|34|35)\s+built-in\s+skills\b/gi, `${skillsCount} built-in skills`);
  updated = updated.replace(/\b(30|31|32|33|34|35)\s+skills\b/gi, `${skillsCount} skills`);
  updated = updated.replace(/skills-\d+-blue/g, `skills-${skillsCount}-blue`);

  // Replace CLI commands
  updated = updated.replace(/\b(17|18|19|20|21|22|23)\s+CLI\s+commands\b/gi, `${cliCommandsCount} CLI commands`);
  updated = updated.replace(/\b(17|18|19|20|21|22|23)\s+commands\b/gi, `${cliCommandsCount} commands`);
  updated = updated.replace(/\b(17|18|19|20|21|22|23)\s+lệnh\b/gi, `${cliCommandsCount} lệnh`);

  // Replace tests
  updated = updated.replace(/\b(200|201|202|207|211|217|221|225|230)\s+unit\s+tests\b/gi, `${testsCount} unit tests`);
  updated = updated.replace(/\b(200|201|202|207|211|217|221|225|230)\s+tests\b/gi, `${testsCount} tests`);
  updated = updated.replace(/tests-\d+%20passing-brightgreen/g, `tests-${testsCount}%20passing-brightgreen`);
  updated = updated.replace(/all\s+\d+\s+must\s+pass/gi, `all ${testsCount} must pass`);

  return updated;
}

let updatedCount = 0;

for (const target of targets) {
  const filePath = join(projectRoot, target);
  if (!existsSync(filePath)) {
    console.warn(`[Version Sync] Target file not found: ${target}`);
    continue;
  }

  try {
    const originalContent = readFileSync(filePath, "utf-8");
    const updatedContent = replaceStats(originalContent);

    if (originalContent !== updatedContent) {
      writeFileSync(filePath, updatedContent, "utf-8");
      console.log(`  ✓ Updated ${target}`);
      updatedCount++;
    } else {
      console.log(`  - No changes needed for ${target}`);
    }
  } catch (err: any) {
    console.error(`  × Failed to update ${target}: ${err.message}`);
  }
}

console.log(`[Version Sync] Completed. Updated ${updatedCount} files.`);

