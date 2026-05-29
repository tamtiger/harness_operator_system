import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { resolveHarnessDir, repoHash, resolveGlobalHome, ensureDir } from "./repo.js";
import { existsSync, rmSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

function makeTempDir(): string {
  return mkdtempSync(join(tmpdir(), "harness-repo-test-"));
}

describe("repo.ts", () => {
  const tempDirs: string[] = [];
  let originalHarnessHome: string | undefined;

  beforeEach(() => {
    originalHarnessHome = process.env.HARNESS_HOME;
    const baseTemp = mkdtempSync(join(tmpdir(), "harness-home-test-"));
    const tempHome = join(baseTemp, ".harness");
    process.env.HARNESS_HOME = tempHome;
    tempDirs.push(baseTemp);
  });

  afterEach(() => {
    process.env.HARNESS_HOME = originalHarnessHome;
    for (const dir of tempDirs) {
      try {
        rmSync(dir, { recursive: true, force: true });
      } catch {
        // ignore
      }
    }
    tempDirs.length = 0;
  });

  describe("ensureDir", () => {
    it("creates directory if not exists", () => {
      const dir = join(makeTempDir(), "sub", "deep");
      tempDirs.push(dir);
      ensureDir(dir);
      expect(existsSync(dir)).toBe(true);
    });

    it("does not throw if directory already exists", () => {
      const dir = makeTempDir();
      tempDirs.push(dir);
      expect(() => ensureDir(dir)).not.toThrow();
    });
  });

  describe("resolveHarnessDir", () => {
    it("returns .harness/ path and creates it", () => {
      const dir = makeTempDir();
      tempDirs.push(dir);
      const result = resolveHarnessDir(dir);
      expect(result).toBe(join(dir, ".harness"));
      expect(existsSync(result)).toBe(true);
    });
  });

  describe("repoHash", () => {
    it("is deterministic", () => {
      const hash1 = repoHash("/some/path");
      const hash2 = repoHash("/some/path");
      expect(hash1).toBe(hash2);
    });

    it("different paths produce different hashes", () => {
      const hash1 = repoHash("/path/a");
      const hash2 = repoHash("/path/b");
      expect(hash1).not.toBe(hash2);
    });

    it("returns 16 char hex string", () => {
      const hash = repoHash("/any/path");
      expect(hash).toMatch(/^[a-f0-9]{16}$/);
    });
  });

  describe("resolveGlobalHome", () => {
    it("returns a path and creates it", () => {
      const home = resolveGlobalHome();
      expect(existsSync(home)).toBe(true);
      expect(home).toContain(".harness");
    });
  });
});
