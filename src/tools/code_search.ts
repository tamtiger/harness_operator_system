import { readdirSync, statSync, readFileSync, existsSync } from "node:fs";
import { join, resolve, relative } from "node:path";
import { log } from "../lib/logger.js";
import { scopeGet } from "./scope.js";
import picomatch from "picomatch";

const MAX_OUTPUT = 8192; // 8KB max output size limit
const IGNORED_DIRS = [
  "node_modules",
  ".git",
  "dist",
  "build",
  "bin",
  "obj",
  ".harness",
  ".kiro",
  "out"
];

const SEARCHABLE_EXTENSIONS = [
  ".ts", ".tsx", ".js", ".jsx", ".cs", ".py", ".go", ".rs", ".java", ".cpp", ".c", ".h", ".php"
];

interface GrepMatch {
  file: string;
  line: number;
  content: string;
}

interface SymbolMatch {
  file: string;
  line: number;
  type: "class" | "function" | "method" | "interface";
  name: string;
  content: string;
}

function traverseDirectory(
  dir: string,
  baseDir: string,
  onFile: (filePath: string) => void,
  isExcluded: (relPath: string) => boolean
) {
  try {
    const files = readdirSync(dir);
    for (const file of files) {
      if (IGNORED_DIRS.includes(file)) continue;

      const fullPath = join(dir, file);
      const relativePath = relative(baseDir, fullPath).replace(/\\/g, "/");
      if (isExcluded(relativePath)) continue;

      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        traverseDirectory(fullPath, baseDir, onFile, isExcluded);
      } else {
        const ext = file.substring(file.lastIndexOf(".")).toLowerCase();
        if (SEARCHABLE_EXTENSIONS.includes(ext)) {
          onFile(fullPath);
        }
      }
    }
  } catch (err: any) {
    log("warn", `Traverse directory error at ${dir}: ${err.message}`);
  }
}

export function codeSearchGrep(
  repoPath: string,
  query: string,
  isRegex: boolean = false
): { matches: GrepMatch[]; truncated: boolean; scope_applied: boolean } {
  const resolvedRepo = resolve(repoPath);
  const matches: GrepMatch[] = [];
  let sizeAcc = 0;
  let truncated = false;

  const scope = scopeGet(resolvedRepo);
  const forbiddenPatterns = scope?.forbidden_paths || [];
  const isExcluded = forbiddenPatterns.length > 0
    ? picomatch(forbiddenPatterns)
    : () => false;

  const regex = isRegex ? new RegExp(query, "i") : null;

  traverseDirectory(resolvedRepo, resolvedRepo, (filePath) => {
    if (truncated) return;

    try {
      const content = readFileSync(filePath, "utf-8");
      const lines = content.split("\n");
      const relativePath = relative(resolvedRepo, filePath).replace(/\\/g, "/");

      lines.forEach((line, index) => {
        if (truncated) return;

        const isMatch = regex ? regex.test(line) : line.includes(query);
        if (isMatch) {
          const matchItem: GrepMatch = {
            file: relativePath,
            line: index + 1,
            content: line.trim()
          };

          const itemSize = JSON.stringify(matchItem).length;
          if (sizeAcc + itemSize > MAX_OUTPUT) {
            truncated = true;
            return;
          }

          matches.push(matchItem);
          sizeAcc += itemSize;
        }
      });
    } catch (err: any) {
      log("warn", `Failed to read file for grep ${filePath}: ${err.message}`);
    }
  }, isExcluded);

  return { matches, truncated, scope_applied: forbiddenPatterns.length > 0 };
}

export function codeSearchSymbols(
  repoPath: string,
  query: string
): { matches: SymbolMatch[]; truncated: boolean; scope_applied: boolean } {
  const resolvedRepo = resolve(repoPath);
  const matches: SymbolMatch[] = [];
  let sizeAcc = 0;
  let truncated = false;

  const scope = scopeGet(resolvedRepo);
  const forbiddenPatterns = scope?.forbidden_paths || [];
  const isExcluded = forbiddenPatterns.length > 0
    ? picomatch(forbiddenPatterns)
    : () => false;

  // Regex patterns to detect symbols in TS/JS, C#, PHP, Python, Go etc.
  const symbolRegexes = [
    // TypeScript / JS / PHP / C# classes and interfaces
    { pattern: /(?:class|interface)\s+([a-zA-Z0-9_]+)/g, type: "class" as const },
    // C# / TypeScript / Go / C++ / PHP methods and functions
    { pattern: /(?:function|fn|void|async\s+function)\s+([a-zA-Z0-9_]+)/g, type: "function" as const },
    // Python methods/functions
    { pattern: /def\s+([a-zA-Z0-9_]+)/g, type: "function" as const }
  ];

  const queryLower = query.toLowerCase();

  traverseDirectory(resolvedRepo, resolvedRepo, (filePath) => {
    if (truncated) return;

    try {
      const content = readFileSync(filePath, "utf-8");
      const lines = content.split("\n");
      const relativePath = relative(resolvedRepo, filePath).replace(/\\/g, "/");

      lines.forEach((line, index) => {
        if (truncated) return;

        for (const rule of symbolRegexes) {
          rule.pattern.lastIndex = 0; // reset regex state
          const match = rule.pattern.exec(line);
          if (match && match[1]) {
            const name = match[1];
            if (name.toLowerCase().includes(queryLower)) {
              const matchItem: SymbolMatch = {
                file: relativePath,
                line: index + 1,
                type: rule.type === "class" && line.includes("interface") ? "interface" : rule.type,
                name,
                content: line.trim()
              };

              const itemSize = JSON.stringify(matchItem).length;
              if (sizeAcc + itemSize > MAX_OUTPUT) {
                truncated = true;
                return;
              }

              matches.push(matchItem);
              sizeAcc += itemSize;
              break; // match once per line
            }
          }
        }
      });
    } catch (err: any) {
      log("warn", `Failed to read file for symbol search ${filePath}: ${err.message}`);
    }
  }, isExcluded);

  return { matches, truncated, scope_applied: forbiddenPatterns.length > 0 };
}
