import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { join, resolve } from "node:path";
import { rmSync, writeFileSync, mkdirSync } from "node:fs";
import { subagentInvoke } from "./subagent.js";

const TEST_REPO = resolve(process.cwd(), ".harness-subagent-test-tmp");

describe("subagentInvoke and worker process", () => {
  beforeAll(() => {
    rmSync(TEST_REPO, { recursive: true, force: true });
    mkdirSync(join(TEST_REPO, ".harness"), { recursive: true });
    writeFileSync(
      join(TEST_REPO, ".harness", "scope.yaml"),
      `forbidden_paths:
  - "**/etc/passwd"
  - "forbidden.txt"
allowed_per_task:
  SUBAGENT:
    - "src/index.ts"
`,
      "utf-8"
    );
  });

  afterAll(() => {
    try {
      rmSync(TEST_REPO, { recursive: true, force: true });
    } catch (e) {
      // Ignore EPERM or folder locks on Windows
    }
  });

  it("handles valid scope and spawns asynchronously", () => {
    const result = subagentInvoke(
      "Coder",
      "Format code",
      ["src/index.ts"],
      ["echo 'hello'"],
      TEST_REPO,
      10,
      false
    );

    expect(result.status).toBe("spawned");
    expect(result.pid).toBeGreaterThan(0);
    expect(result.run_file).toBeDefined();
    expect(result.result_file).toBeDefined();
  });

  it("handles wait: true blocking execution and command completion", () => {
    const result = subagentInvoke(
      "Tester",
      "Run tests",
      ["src/index.ts"],
      ["echo 'test output'"],
      TEST_REPO,
      10,
      true
    );

    expect(result.status).toBe("success");
    expect(result.run_file).toBeDefined();
    expect(result.result_file).toBeDefined();
    expect(result.result).toBeDefined();
    expect(result.result.status).toBe("success");
    expect(result.result.command_results[0].stdout).toContain("test output");
  });

  it("fails with scope violation for out-of-scope files", () => {
    const result = subagentInvoke(
      "Coder",
      "Run command",
      ["forbidden.txt"],
      ["echo 'hello'"],
      TEST_REPO,
      10,
      false
    );

    expect(result.status).toBe("failure");
    expect(result.error).toContain("Scope violation");
  });
});
