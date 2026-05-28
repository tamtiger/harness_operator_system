import { readdirSync, statSync } from "node:fs";
import { join, basename } from "node:path";

export interface TreeOptions {
  path: string;
  depth?: number;
  exclude?: string[];
}

const DEFAULT_EXCLUDES = [
  ".git",
  "node_modules",
  "bin",
  "obj",
  "dist",
  ".vs",
  ".idea",
  "__pycache__",
];

/**
 * Generate an ASCII directory tree for the given path.
 * Respects depth limit and exclusion patterns.
 */
export function generateTree(opts: TreeOptions): string {
  const maxDepth = opts.depth ?? 4;
  const excludes = opts.exclude ?? DEFAULT_EXCLUDES;
  const rootName = basename(opts.path) || opts.path;

  const lines: string[] = [rootName];
  buildTree(opts.path, "", maxDepth, excludes, lines);
  return lines.join("\n");
}

function buildTree(
  dirPath: string,
  prefix: string,
  depthLeft: number,
  excludes: string[],
  lines: string[]
): void {
  if (depthLeft <= 0) return;

  let entries: string[];
  try {
    entries = readdirSync(dirPath);
  } catch {
    return;
  }

  // Filter excluded names
  entries = entries.filter((e) => !excludes.includes(e));
  // Sort: directories first, then alphabetical
  entries.sort((a, b) => {
    const aIsDir = isDir(join(dirPath, a));
    const bIsDir = isDir(join(dirPath, b));
    if (aIsDir && !bIsDir) return -1;
    if (!aIsDir && bIsDir) return 1;
    return a.localeCompare(b);
  });

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const isLast = i === entries.length - 1;
    const connector = isLast ? "└── " : "├── ";
    const childPrefix = isLast ? "    " : "│   ";
    const fullPath = join(dirPath, entry);

    lines.push(prefix + connector + entry);

    if (isDir(fullPath)) {
      buildTree(fullPath, prefix + childPrefix, depthLeft - 1, excludes, lines);
    }
  }
}

function isDir(p: string): boolean {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}
