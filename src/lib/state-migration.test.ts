import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { migrateRepoState } from "./state-migration.js";
import { generateRepoId } from "./repo-identity.js";
import { existsSync, rmSync, mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("state-migration.ts", () => {
  let tempDir: string;
  let repoId: string;
  let originalHarnessHome: string | undefined;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "harness-migration-test-"));
    repoId = generateRepoId();
    originalHarnessHome = process.env.HARNESS_HOME;
    process.env.HARNESS_HOME = join(tempDir, "harness_home");
  });

  afterEach(() => {
    process.env.HARNESS_HOME = originalHarnessHome;
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  function setupLocalHarness(files: Record<string, string>): void {
    const harnessDir = join(tempDir, ".harness");
    mkdirSync(harnessDir, { recursive: true });
    for (const [relPath, content] of Object.entries(files)) {
      const fullPath = join(harnessDir, relPath);
      mkdirSync(join(fullPath, "..").replace(/[/\\][^/\\]*$/, ""), { recursive: true });
      // Ensure parent dir exists
      const parentDir = fullPath.substring(0, fullPath.lastIndexOf(fullPath.includes("/") ? "/" : "\\"));
      if (parentDir && parentDir !== harnessDir) {
        mkdirSync(parentDir, { recursive: true });
      }
      writeFileSync(fullPath, content, "utf-8");
    }
  }

  describe("migrateRepoState", () => {
    it("copies files that exist in local .harness/", () => {
      const harnessDir = join(tempDir, ".harness");
      mkdirSync(harnessDir, { recursive: true });
      writeFileSync(join(harnessDir, "progress.md"), "# Progress", "utf-8");
      writeFileSync(join(harnessDir, "feature_list.json"), "{}", "utf-8");

      const result = migrateRepoState(tempDir, repoId);

      expect(result.migrated).toBe(true);
      expect(result.files_copied).toContain("progress.md");
      expect(result.files_copied).toContain("feature_list.json");
      expect(result.errors).toHaveLength(0);
    });

    it("skips files that already exist at target (idempotent)", () => {
      const harnessDir = join(tempDir, ".harness");
      mkdirSync(harnessDir, { recursive: true });
      writeFileSync(join(harnessDir, "progress.md"), "# Progress", "utf-8");

      // First migration
      migrateRepoState(tempDir, repoId);

      // Second migration — should skip
      const result = migrateRepoState(tempDir, repoId);
      expect(result.skipped).toContain("progress.md");
      expect(result.files_copied).not.toContain("progress.md");
    });

    it("handles missing source files gracefully", () => {
      // No .harness/ files at all
      const harnessDir = join(tempDir, ".harness");
      mkdirSync(harnessDir, { recursive: true });

      const result = migrateRepoState(tempDir, repoId);

      expect(result.migrated).toBe(true);
      expect(result.files_copied).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it("preserves original files after copy", () => {
      const harnessDir = join(tempDir, ".harness");
      mkdirSync(harnessDir, { recursive: true });
      const content = "# My Progress Log\nEntry 1";
      writeFileSync(join(harnessDir, "progress.md"), content, "utf-8");

      migrateRepoState(tempDir, repoId);

      // Original still exists and unchanged
      const original = readFileSync(join(harnessDir, "progress.md"), "utf-8");
      expect(original).toBe(content);
    });

    it("copies handoff_last.json when it exists", () => {
      const harnessDir = join(tempDir, ".harness");
      mkdirSync(harnessDir, { recursive: true });
      writeFileSync(join(harnessDir, "handoff_last.json"), '{"next_steps":[]}', "utf-8");

      const result = migrateRepoState(tempDir, repoId);

      expect(result.files_copied).toContain("handoff_last.json");
    });
  });
});
