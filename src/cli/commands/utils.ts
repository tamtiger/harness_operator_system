import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const args = process.argv.slice(2);

export function getFlag(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1) return undefined;
  return args[idx + 1];
}

export function hasFlag(name: string): boolean {
  return args.includes(`--${name}`);
}

export function getProjectRoot(): string {
  const thisFile = fileURLToPath(import.meta.url);
  // Compiled file will be in dist/cli/commands/utils.js
  // Path from dist/cli/commands/utils.js to project root is 3 levels up
  return resolve(dirname(thisFile), "..", "..", "..");
}
