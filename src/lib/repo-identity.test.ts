import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { generateRepoId, createRepoConfig, readRepoConfig, resolveGlobalRepoPath } from "./repo-identity.js";
import { existsSync, rmSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("repo-identity.ts", () => {
  let tempDir: string;
  let originalHarnessHome: string | undefined;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "harness-identity-test-"));
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

  describe("generateRepoId", () => {
    it("returns a valid UUID v4 format when no repoName is provided", () => {
      const id = generateRepoId();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
      expect(id).toMatch(uuidRegex);
    });

    it("returns a prefixed ID when repoName is provided", () => {
      const id = generateRepoId("My-Repo@123");
      expect(id).toMatch(/^my-repo_123-[0-9a-f]{8}$/);
    });

    it("generates unique IDs on each call", () => {
      const id1 = generateRepoId();
      const id2 = generateRepoId();
      expect(id1).not.toBe(id2);
    });
  });

  describe("createRepoConfig", () => {
    it("creates config.yaml file in .harness/", () => {
      createRepoConfig(tempDir);
      const configPath = join(tempDir, ".harness", "config.yaml");
      expect(existsSync(configPath)).toBe(true);
    });

    it("returns a RepoConfig with valid fields", () => {
      const config = createRepoConfig(tempDir);
      expect(config.repo_id).toBeTruthy();
      expect(config.repo_name).toBeTruthy();
      expect(config.harness_home).toBeTruthy();
      expect(config.registered_at).toBeTruthy();
    });
  });

  describe("readRepoConfig", () => {
    it("reads back what was written by createRepoConfig", () => {
      const written = createRepoConfig(tempDir);
      const read = readRepoConfig(tempDir);
      expect(read).not.toBeNull();
      expect(read!.repo_id).toBe(written.repo_id);
      expect(read!.repo_name).toBe(written.repo_name);
      expect(read!.harness_home).toBe(written.harness_home);
    });

    it("returns null for non-existent path", () => {
      const result = readRepoConfig(join(tempDir, "nonexistent"));
      expect(result).toBeNull();
    });

    it("returns null when .harness/ exists but no config.yaml", () => {
      const result = readRepoConfig(tempDir);
      expect(result).toBeNull();
    });
  });

  describe("resolveGlobalRepoPath", () => {
    it("creates directory and returns path", () => {
      const id = generateRepoId();
      const globalPath = resolveGlobalRepoPath(id);
      expect(existsSync(globalPath)).toBe(true);
      expect(globalPath).toContain(id);
    });
  });
});
