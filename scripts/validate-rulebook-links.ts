/**
 * Validate relative markdown links in rulebooks.
 *
 * Walks all `rulebooks/**\/*.md` files, extracts relative links,
 * and checks that the target files exist on disk.
 *
 * Usage: npx tsx scripts/validate-rulebook-links.ts
 * Exit code: 0 if all links valid, 1 if broken links found.
 */

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const thisFile = fileURLToPath(import.meta.url);
const projectRoot = resolve(dirname(thisFile), "..");
const rulebooksDir = join(projectRoot, "rulebooks");

interface BrokenLink {
  file: string;
  line: number;
  link: string;
  target: string;
}

function walkMarkdownFiles(dir: string): string[] {
  const results: string[] = [];

  function walk(currentDir: string): void {
    let entries: ReturnType<typeof readdirSync>;
    try {
      entries = readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name.endsWith(".md")) {
        results.push(fullPath);
      }
    }
  }

  walk(dir);
  return results;
}

function extractRelativeLinks(
  filePath: string
): Array<{ link: string; line: number }> {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const results: Array<{ link: string; line: number }> = [];

  // Match [text](path) where path is relative (not http/https/mailto/#)
  const linkRegex = /\[([^\]]*)\]\(([^)]+)\)/g;

  for (let i = 0; i < lines.length; i++) {
    let match: RegExpExecArray | null;
    linkRegex.lastIndex = 0;
    while ((match = linkRegex.exec(lines[i])) !== null) {
      const linkTarget = match[2];
      // Skip absolute URLs, anchors, and protocol links
      if (
        linkTarget.startsWith("http://") ||
        linkTarget.startsWith("https://") ||
        linkTarget.startsWith("mailto:") ||
        linkTarget.startsWith("#")
      ) {
        continue;
      }
      // Strip anchor from relative links (e.g., ./file.md#section)
      const pathOnly = linkTarget.split("#")[0];
      if (pathOnly.length > 0) {
        results.push({ link: pathOnly, line: i + 1 });
      }
    }
  }

  return results;
}

function validateLinks(): BrokenLink[] {
  const broken: BrokenLink[] = [];

  if (!existsSync(rulebooksDir)) {
    console.error(`Rulebooks directory not found: ${rulebooksDir}`);
    process.exit(1);
  }

  const mdFiles = walkMarkdownFiles(rulebooksDir);
  console.log(`Found ${mdFiles.length} markdown files in rulebooks/`);

  for (const filePath of mdFiles) {
    const links = extractRelativeLinks(filePath);
    const fileDir = dirname(filePath);

    for (const { link, line } of links) {
      const targetPath = resolve(fileDir, link);
      if (!existsSync(targetPath)) {
        const relativeFile = filePath.replace(projectRoot + "\\", "").replace(projectRoot + "/", "");
        broken.push({
          file: relativeFile,
          line,
          link,
          target: targetPath,
        });
      }
    }
  }

  return broken;
}

// Main
const brokenLinks = validateLinks();

if (brokenLinks.length === 0) {
  console.log("✅ All relative links are valid.");
  process.exit(0);
} else {
  console.error(`\n❌ Found ${brokenLinks.length} broken link(s):\n`);
  for (const { file, line, link } of brokenLinks) {
    console.error(`  ${file}:${line} → ${link}`);
  }
  console.error("");
  process.exit(1);
}
