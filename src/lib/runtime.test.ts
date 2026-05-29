import { describe, it, expect } from "vitest";
import { detectRuntime } from "./runtime.js";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

function makeTempDir(): string {
  return mkdtempSync(join(tmpdir(), "harness-test-"));
}

describe("detectRuntime", () => {
  it("detects node runtime from package.json", () => {
    const dir = makeTempDir();
    writeFileSync(join(dir, "package.json"), "{}");
    try {
      const result = detectRuntime(dir);
      expect(result.runtime).toBe("node");
      expect(result.packageManager).toBe("npm");
      expect(result.commands.install).toBe("npm install");
      expect(result.commands.build).toBe("npm run build");
      expect(result.commands.test).toBe("npm run test");
    } finally {
      rmSync(dir, { recursive: true });
    }
  });

  it("detects node with lock file uses npm ci", () => {
    const dir = makeTempDir();
    writeFileSync(join(dir, "package.json"), "{}");
    writeFileSync(join(dir, "package-lock.json"), "{}");
    try {
      const result = detectRuntime(dir);
      expect(result.runtime).toBe("node");
      expect(result.commands.install).toBe("npm ci");
    } finally {
      rmSync(dir, { recursive: true });
    }
  });

  it("detects bun when bun.lockb exists", () => {
    const dir = makeTempDir();
    writeFileSync(join(dir, "package.json"), "{}");
    writeFileSync(join(dir, "bun.lockb"), "{}");
    try {
      const result = detectRuntime(dir);
      expect(result.runtime).toBe("node");
      expect(result.packageManager).toBe("bun");
      expect(result.commands.install).toBe("bun install");
      expect(result.commands.build).toBe("bun run build");
      expect(result.commands.test).toBe("bun run test");
    } finally {
      rmSync(dir, { recursive: true });
    }
  });

  it("detects pnpm when pnpm-lock.yaml exists", () => {
    const dir = makeTempDir();
    writeFileSync(join(dir, "package.json"), "{}");
    writeFileSync(join(dir, "pnpm-lock.yaml"), "{}");
    try {
      const result = detectRuntime(dir);
      expect(result.runtime).toBe("node");
      expect(result.packageManager).toBe("pnpm");
      expect(result.commands.install).toBe("pnpm install --frozen-lockfile");
      expect(result.commands.build).toBe("pnpm run build");
    } finally {
      rmSync(dir, { recursive: true });
    }
  });

  it("detects python runtime from pyproject.toml", () => {
    const dir = makeTempDir();
    writeFileSync(join(dir, "pyproject.toml"), "");
    try {
      const result = detectRuntime(dir);
      expect(result.runtime).toBe("python");
      expect(result.commands.test).toBe("pytest");
    } finally {
      rmSync(dir, { recursive: true });
    }
  });

  it("detects go runtime from go.mod", () => {
    const dir = makeTempDir();
    writeFileSync(join(dir, "go.mod"), "");
    try {
      const result = detectRuntime(dir);
      expect(result.runtime).toBe("go");
      expect(result.commands.build).toBe("go build ./...");
    } finally {
      rmSync(dir, { recursive: true });
    }
  });

  it("detects dotnet runtime from .sln file", () => {
    const dir = makeTempDir();
    writeFileSync(join(dir, "MyApp.sln"), "");
    try {
      const result = detectRuntime(dir);
      expect(result.runtime).toBe("dotnet");
      expect(result.commands.install).toBe("dotnet restore");
    } finally {
      rmSync(dir, { recursive: true });
    }
  });

  it("returns unknown for empty directory", () => {
    const dir = makeTempDir();
    try {
      const result = detectRuntime(dir);
      expect(result.runtime).toBe("unknown");
      expect(result.commands.install).toBeNull();
    } finally {
      rmSync(dir, { recursive: true });
    }
  });
});
