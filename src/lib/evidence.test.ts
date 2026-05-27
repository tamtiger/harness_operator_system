import { describe, it, expect, afterEach } from "vitest";
import { saveEvidence, readEvidence } from "./evidence.js";
import { existsSync, mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

function makeTempDir(): string {
  return mkdtempSync(join(tmpdir(), "harness-evidence-test-"));
}

describe("evidence.ts", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs) {
      try {
        rmSync(dir, { recursive: true, force: true });
      } catch {
        // ignore
      }
    }
    tempDirs.length = 0;
  });

  describe("saveEvidence", () => {
    it("saves evidence and file exists on disk", () => {
      const dir = makeTempDir();
      tempDirs.push(dir);

      const result = saveEvidence(dir, "task-1", { passed: true, steps: 3 });

      expect(result.saved).toBe(true);
      expect(existsSync(result.path)).toBe(true);
      expect(result.path).toContain(join(".harness", "evidence", "task-1", "verify.json"));
    });

    it("overwrites previous evidence for same task", () => {
      const dir = makeTempDir();
      tempDirs.push(dir);

      saveEvidence(dir, "task-2", { passed: false, reason: "build failed" });
      const result = saveEvidence(dir, "task-2", { passed: true, reason: "all green" });

      expect(result.saved).toBe(true);
      const data = readEvidence(dir, "task-2");
      expect(data).not.toBeNull();
      expect(data!.passed).toBe(true);
      expect(data!.reason).toBe("all green");
    });
  });

  describe("readEvidence", () => {
    it("reads saved evidence back with saved_at timestamp", () => {
      const dir = makeTempDir();
      tempDirs.push(dir);

      saveEvidence(dir, "task-3", { passed: true, output: "ok" });
      const data = readEvidence(dir, "task-3");

      expect(data).not.toBeNull();
      expect(data!.passed).toBe(true);
      expect(data!.output).toBe("ok");
      expect(data!.saved_at).toBeDefined();
      // saved_at should be a valid ISO string
      expect(new Date(data!.saved_at as string).toISOString()).toBe(data!.saved_at);
    });

    it("returns null for non-existent evidence", () => {
      const dir = makeTempDir();
      tempDirs.push(dir);

      const data = readEvidence(dir, "no-such-task");
      expect(data).toBeNull();
    });

    it("returns null for corrupted JSON", () => {
      const dir = makeTempDir();
      tempDirs.push(dir);

      // Manually write invalid JSON to the evidence path
      const evidenceDir = join(dir, ".harness", "evidence", "bad-task");
      mkdirSync(evidenceDir, { recursive: true });
      writeFileSync(join(evidenceDir, "verify.json"), "not valid json{{{", "utf-8");

      const data = readEvidence(dir, "bad-task");
      expect(data).toBeNull();
    });
  });
});
