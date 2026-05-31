import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const thisFile = fileURLToPath(import.meta.url);
const projectRoot = resolve(dirname(thisFile), "..");

// 1. Read single source of truth from package.json
const packageJsonPath = join(projectRoot, "package.json");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
const version = packageJson.version;

console.log(`[Version Sync] Synchronizing version ${version} across the codebase...`);

const targets = [
  // { path, pattern, replacement }
  {
    file: "README.md",
    pattern: /version-\d+\.\d+\.\d+-blue/g,
    replacement: `version-${version}-blue`,
  },
  {
    file: "AGENTS.md",
    pattern: /- \*\*Version:\*\* \d+\.\d+\.\d+/g,
    replacement: `- **Version:** ${version}`,
  },
  {
    file: "docs/README.md",
    pattern: /harness-os v\d+\.\d+\.\d+/g,
    replacement: `harness-os v${version}`,
  },
  {
    file: "docs/README.md",
    pattern: /\*Tài liệu cập nhật cho harness-os v\d+\.\d+\.\d+\.\*/g,
    replacement: `*Tài liệu cập nhật cho harness-os v${version}.*`,
  },
];

let updatedCount = 0;

for (const target of targets) {
  const filePath = join(projectRoot, target.file);
  if (!existsSync(filePath)) {
    console.warn(`[Version Sync] Target file not found: ${target.file}`);
    continue;
  }

  try {
    const originalContent = readFileSync(filePath, "utf-8");
    const updatedContent = originalContent.replace(target.pattern, target.replacement);

    if (originalContent !== updatedContent) {
      writeFileSync(filePath, updatedContent, "utf-8");
      console.log(`  ✓ Updated ${target.file}`);
      updatedCount++;
    } else {
      console.log(`  - No changes needed for ${target.file}`);
    }
  } catch (err: any) {
    console.error(`  × Failed to update ${target.file}: ${err.message}`);
  }
}

console.log(`[Version Sync] Completed. Updated ${updatedCount} files.`);
