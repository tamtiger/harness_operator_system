import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { generateTree } from "./tree.js";

const TEST_DIR = join(process.cwd(), ".test-tree-tmp");

beforeEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
  mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe("generateTree", () => {
  it("generates tree for empty directory", () => {
    const result = generateTree({ path: TEST_DIR });
    expect(result).toContain(".test-tree-tmp");
    // Only the root line, no children
    expect(result.split("\n").length).toBe(1);
  });

  it("shows files and directories", () => {
    writeFileSync(join(TEST_DIR, "file.txt"), "hello");
    mkdirSync(join(TEST_DIR, "subdir"));
    writeFileSync(join(TEST_DIR, "subdir", "nested.ts"), "code");

    const result = generateTree({ path: TEST_DIR });
    expect(result).toContain("file.txt");
    expect(result).toContain("subdir");
    expect(result).toContain("nested.ts");
  });

  it("respects depth limit", () => {
    mkdirSync(join(TEST_DIR, "a", "b", "c"), { recursive: true });
    writeFileSync(join(TEST_DIR, "a", "b", "c", "deep.ts"), "deep");

    const result = generateTree({ path: TEST_DIR, depth: 2 });
    expect(result).toContain("a");
    expect(result).toContain("b");
    // depth 2 means 2 levels of recursion: a (level 1), b (level 2)
    // c is at level 3, should NOT appear
    expect(result).not.toContain("c");
    expect(result).not.toContain("deep.ts");
  });

  it("excludes default patterns", () => {
    mkdirSync(join(TEST_DIR, "node_modules"));
    mkdirSync(join(TEST_DIR, ".git"));
    mkdirSync(join(TEST_DIR, "src"));
    writeFileSync(join(TEST_DIR, "src", "index.ts"), "code");

    const result = generateTree({ path: TEST_DIR });
    expect(result).not.toContain("node_modules");
    expect(result).not.toContain(".git");
    expect(result).toContain("src");
    expect(result).toContain("index.ts");
  });

  it("uses custom exclude list", () => {
    mkdirSync(join(TEST_DIR, "src"));
    mkdirSync(join(TEST_DIR, "build"));
    writeFileSync(join(TEST_DIR, "src", "app.ts"), "code");

    const result = generateTree({ path: TEST_DIR, exclude: ["build"] });
    expect(result).not.toContain("build");
    expect(result).toContain("src");
  });

  it("uses ASCII art connectors", () => {
    writeFileSync(join(TEST_DIR, "a.txt"), "a");
    writeFileSync(join(TEST_DIR, "b.txt"), "b");

    const result = generateTree({ path: TEST_DIR });
    expect(result).toMatch(/[├└]── /);
  });
});
