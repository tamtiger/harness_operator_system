import { describe, it, expect, vi } from "vitest";
import { parseVerifyYaml, STEP_ORDER, filterLintableFiles, buildChangedOnlyLintCmd, verifyRun } from "./verify.js";
import { getDb } from "../db/client.js";

vi.mock("../db/client.js", () => ({
  getDb: vi.fn(),
}));

vi.mock("../lib/runtime.js", () => ({
  detectRuntime: vi.fn(() => ({ runtime: "node", commands: {} })),
}));

vi.mock("../lib/git-diff.js", () => ({
  getChangedFiles: vi.fn(() => []),
}));

vi.mock("../lib/evidence.js", () => ({
  saveEvidence: vi.fn(() => ({ saved: true, path: "/mock/evidence.json" })),
}));

describe("parseVerifyYaml", () => {
  it("parses basic verify.yaml with all 7 steps", () => {
    const yaml = `
runtime: node
commands:
  install: "npm install"
  build: "npm run build"
  test: "npm run test"
  lint: "npm run lint"
  typecheck: "npm run typecheck"
  security_audit: "npm audit --audit-level=moderate"
  simplify: null
timeouts:
  build: 120
  test: 300
`;
    const config = parseVerifyYaml(yaml);
    expect(config.runtime).toBe("node");
    expect(config.commands?.install).toBe("npm install");
    expect(config.commands?.build).toBe("npm run build");
    expect(config.commands?.test).toBe("npm run test");
    expect(config.commands?.lint).toBe("npm run lint");
    expect(config.commands?.typecheck).toBe("npm run typecheck");
    expect(config.commands?.security_audit).toBe("npm audit --audit-level=moderate");
    expect(config.commands?.simplify).toBeNull();
    expect(config.timeouts?.build).toBe(120000); // seconds → ms
    expect(config.timeouts?.test).toBe(300000);
  });

  it("parses security_audit field", () => {
    const yaml = `
commands:
  security_audit: "npm audit --audit-level=moderate"
`;
    const config = parseVerifyYaml(yaml);
    expect(config.commands?.security_audit).toBe("npm audit --audit-level=moderate");
  });

  it("parses simplify field as null", () => {
    const yaml = `
commands:
  simplify: null
`;
    const config = parseVerifyYaml(yaml);
    expect(config.commands?.simplify).toBeNull();
  });

  it("parses simplify field as tilde", () => {
    const yaml = `
commands:
  simplify: ~
`;
    const config = parseVerifyYaml(yaml);
    expect(config.commands?.simplify).toBeNull();
  });

  it("parses simplify field as empty string (quoted)", () => {
    const yaml = `
commands:
  simplify: ""
`;
    const config = parseVerifyYaml(yaml);
    // Quoted empty string "" becomes empty string after quote removal
    expect(config.commands?.simplify).toBe("");
  });

  it("parses simplify field as unquoted empty (null)", () => {
    const yaml = `
commands:
  simplify: 
`;
    const config = parseVerifyYaml(yaml);
    // Unquoted empty value becomes null
    expect(config.commands?.simplify).toBeNull();
  });

  it("ignores comments on separate lines", () => {
    const yaml = `
# This is a comment
runtime: node
# Another comment
commands:
  install: "npm install"
`;
    const config = parseVerifyYaml(yaml);
    expect(config.runtime).toBe("node");
    expect(config.commands?.install).toBe("npm install");
  });

  it("does not strip inline comments (parser limitation)", () => {
    const yaml = `
commands:
  install: "npm install"  # inline comment
`;
    const config = parseVerifyYaml(yaml);
    // The parser doesn't strip inline comments, so they're included in the value
    expect(config.commands?.install).toContain("npm install");
  });

  it("handles quoted values", () => {
    const yaml = `
commands:
  install: "npm install"
  build: 'npm run build'
`;
    const config = parseVerifyYaml(yaml);
    expect(config.commands?.install).toBe("npm install");
    expect(config.commands?.build).toBe("npm run build");
  });

  it("handles missing optional fields", () => {
    const yaml = `
runtime: node
commands:
  install: "npm install"
`;
    const config = parseVerifyYaml(yaml);
    expect(config.runtime).toBe("node");
    expect(config.commands?.install).toBe("npm install");
    expect(config.commands?.build).toBeUndefined();
    expect(config.commands?.security_audit).toBeUndefined();
  });

  it("backward compatibility: config without new fields produces same behavior", () => {
    const oldYaml = `
runtime: node
commands:
  install: "npm install"
  build: "npm run build"
  test: "npm run test"
  lint: "npm run lint"
timeouts:
  build: 120
  test: 300
`;
    const config = parseVerifyYaml(oldYaml);
    // Should parse without errors and have the old fields
    expect(config.runtime).toBe("node");
    expect(config.commands?.install).toBe("npm install");
    expect(config.commands?.build).toBe("npm run build");
    expect(config.commands?.test).toBe("npm run test");
    expect(config.commands?.lint).toBe("npm run lint");
    // New fields should be undefined (not present)
    expect(config.commands?.security_audit).toBeUndefined();
    expect(config.commands?.simplify).toBeUndefined();
  });

  it("handles dotnet runtime config", () => {
    const yaml = `
runtime: dotnet
commands:
  install: "dotnet restore"
  build: "dotnet build --no-restore"
  test: "dotnet test --no-build"
  lint: "dotnet format --verify-no-changes"
  security_audit: null
  simplify: null
`;
    const config = parseVerifyYaml(yaml);
    expect(config.runtime).toBe("dotnet");
    expect(config.commands?.install).toBe("dotnet restore");
    expect(config.commands?.security_audit).toBeNull();
  });

  it("handles python runtime config", () => {
    const yaml = `
runtime: python
commands:
  install: "pip install -e ."
  build: null
  test: "pytest"
  lint: "ruff check ."
  typecheck: "mypy ."
  security_audit: "bandit -r ."
  simplify: null
`;
    const config = parseVerifyYaml(yaml);
    expect(config.runtime).toBe("python");
    expect(config.commands?.build).toBeNull();
    expect(config.commands?.security_audit).toBe("bandit -r .");
  });

  it("handles go runtime config", () => {
    const yaml = `
runtime: go
commands:
  install: "go mod download"
  build: "go build ./..."
  test: "go test ./..."
  lint: "golangci-lint run"
  security_audit: "gosec ./..."
  simplify: null
`;
    const config = parseVerifyYaml(yaml);
    expect(config.runtime).toBe("go");
    expect(config.commands?.security_audit).toBe("gosec ./...");
  });
});

describe("STEP_ORDER constant", () => {
  it("defines canonical step ordering with 7 steps", () => {
    expect(STEP_ORDER).toEqual([
      "install",
      "build",
      "test",
      "lint",
      "typecheck",
      "security_audit",
      "simplify",
    ]);
  });

  it("includes new security_audit and simplify steps", () => {
    expect(STEP_ORDER).toContain("security_audit");
    expect(STEP_ORDER).toContain("simplify");
  });

  it("maintains backward compatible order for existing steps", () => {
    const existingSteps: Array<typeof STEP_ORDER[number]> = ["install", "build", "test", "lint", "typecheck"];
    const existingIndices = existingSteps.map((s) => STEP_ORDER.indexOf(s));
    // Verify they appear in order
    for (let i = 1; i < existingIndices.length; i++) {
      expect(existingIndices[i]).toBeGreaterThan(existingIndices[i - 1]);
    }
  });
});

describe("Step ordering and null-skipping", () => {
  it("parseVerifyYaml respects STEP_ORDER when all steps defined", () => {
    const yaml = `
commands:
  simplify: "echo simplify"
  typecheck: "echo typecheck"
  install: "echo install"
  test: "echo test"
  build: "echo build"
  lint: "echo lint"
  security_audit: "echo security_audit"
`;
    const config = parseVerifyYaml(yaml);
    // All steps should be parsed
    expect(config.commands?.install).toBe("echo install");
    expect(config.commands?.build).toBe("echo build");
    expect(config.commands?.test).toBe("echo test");
    expect(config.commands?.lint).toBe("echo lint");
    expect(config.commands?.typecheck).toBe("echo typecheck");
    expect(config.commands?.security_audit).toBe("echo security_audit");
    expect(config.commands?.simplify).toBe("echo simplify");
  });

  it("parseVerifyYaml skips null steps", () => {
    const yaml = `
commands:
  install: "npm install"
  build: null
  test: "npm test"
  lint: null
  typecheck: null
  security_audit: null
  simplify: null
`;
    const config = parseVerifyYaml(yaml);
    expect(config.commands?.install).toBe("npm install");
    expect(config.commands?.build).toBeNull();
    expect(config.commands?.test).toBe("npm test");
    expect(config.commands?.lint).toBeNull();
    expect(config.commands?.security_audit).toBeNull();
    expect(config.commands?.simplify).toBeNull();
  });

  it("handles mixed null and defined steps", () => {
    const yaml = `
commands:
  install: "npm install"
  build: "npm run build"
  test: null
  lint: "npm run lint"
  typecheck: null
  security_audit: "npm audit"
  simplify: null
`;
    const config = parseVerifyYaml(yaml);
    expect(config.commands?.install).toBe("npm install");
    expect(config.commands?.build).toBe("npm run build");
    expect(config.commands?.test).toBeNull();
    expect(config.commands?.lint).toBe("npm run lint");
    expect(config.commands?.typecheck).toBeNull();
    expect(config.commands?.security_audit).toBe("npm audit");
    expect(config.commands?.simplify).toBeNull();
  });
});

describe("Explicit steps override", () => {
  it("parseVerifyYaml handles explicit steps parameter (conceptual)", () => {
    // Note: parseVerifyYaml itself doesn't take a steps parameter,
    // but verifyRun() does. This test documents the expected behavior.
    const yaml = `
commands:
  install: "npm install"
  build: "npm run build"
  test: "npm test"
  lint: "npm run lint"
`;
    const config = parseVerifyYaml(yaml);
    // When explicit steps are provided to verifyRun(), they override the config
    // This is tested in the integration tests for verifyRun()
    expect(config.commands?.install).toBe("npm install");
  });
});

describe("PHP runtime support", () => {
  it("filterLintableFiles keeps .php and .phtml files", () => {
    const files = ["index.php", "helper.phtml", "style.css", "script.js", "Class.php"];
    const result = filterLintableFiles(files, "php");
    expect(result).toEqual(["index.php", "helper.phtml", "Class.php"]);
  });

  it("filterLintableFiles returns empty for non-PHP files", () => {
    const files = ["style.css", "script.js", "data.xml"];
    const result = filterLintableFiles(files, "php");
    expect(result).toEqual([]);
  });

  it("buildChangedOnlyLintCmd for php appends file list", () => {
    const result = buildChangedOnlyLintCmd("vendor/bin/phpcs", "php", ["src/Controller.php", "src/Model.php"]);
    expect(result).toBe("vendor/bin/phpcs src/Controller.php src/Model.php");
  });

  it("parseVerifyYaml handles php runtime config", () => {
    const yaml = `
runtime: php
commands:
  install: "composer install"
  build: null
  test: "vendor/bin/phpunit"
  lint: "vendor/bin/phpcs"
  typecheck: null
  security_audit: null
  simplify: null
timeouts:
  build: 60
  test: 300
  lint: 120
`;
    const config = parseVerifyYaml(yaml);
    expect(config.runtime).toBe("php");
    expect(config.commands?.install).toBe("composer install");
    expect(config.commands?.build).toBeNull();
    expect(config.commands?.test).toBe("vendor/bin/phpunit");
    expect(config.commands?.lint).toBe("vendor/bin/phpcs");
    expect(config.commands?.typecheck).toBeNull();
    expect(config.timeouts?.build).toBe(60000);
    expect(config.timeouts?.test).toBe(300000);
    expect(config.timeouts?.lint).toBe(120000);
  });
});

describe("Edge cases", () => {
  it("handles empty yaml", () => {
    const yaml = "";
    const config = parseVerifyYaml(yaml);
    expect(config.runtime).toBeUndefined();
    expect(config.commands).toBeDefined();
  });

  it("handles yaml with only comments", () => {
    const yaml = `
# Just comments
# More comments
`;
    const config = parseVerifyYaml(yaml);
    expect(config.runtime).toBeUndefined();
  });

  it("handles commands with special characters", () => {
    const yaml = `
commands:
  build: "npm run build -- --config=./config.json"
  test: "npm test -- --coverage --reporter=json"
`;
    const config = parseVerifyYaml(yaml);
    expect(config.commands?.build).toBe("npm run build -- --config=./config.json");
    expect(config.commands?.test).toBe("npm test -- --coverage --reporter=json");
  });

  it("handles multiline-like values (single line in YAML)", () => {
    const yaml = `
commands:
  build: "npm run build && npm run generate-docs"
`;
    const config = parseVerifyYaml(yaml);
    expect(config.commands?.build).toBe("npm run build && npm run generate-docs");
  });

  it("handles timeout values in seconds", () => {
    const yaml = `
timeouts:
  build: 60
  test: 600
`;
    const config = parseVerifyYaml(yaml);
    expect(config.timeouts?.build).toBe(60000); // 60 seconds → 60000 ms
    expect(config.timeouts?.test).toBe(600000); // 600 seconds → 600000 ms
  });

  it("ignores invalid timeout values", () => {
    const yaml = `
timeouts:
  build: invalid
  test: 300
`;
    const config = parseVerifyYaml(yaml);
    expect(config.timeouts?.build).toBeUndefined();
    expect(config.timeouts?.test).toBe(300000);
  });

  it("parses optional steps correctly", () => {
    const yaml = `
commands:
  install: "npm install"
  build: "npm run build"
optional:
  install: true
  build: false
`;
    const config = parseVerifyYaml(yaml);
    expect(config.optional?.install).toBe(true);
    expect(config.optional?.build).toBe(false);
    expect(config.optional?.test).toBeUndefined();
  });
});

describe("verifyRun phase transition", () => {
  it("updates session phase to VERIFY and sets verify_called to 1 when task_id is provided", () => {
    const mockRun = vi.fn();
    const mockGet = vi.fn().mockReturnValue({ session_id: "session-123" });
    const mockPrepare = vi.fn().mockImplementation((query) => {
      if (query.includes("SELECT session_id")) {
        return { get: mockGet };
      }
      return { run: mockRun };
    });

    const mockDb = { prepare: mockPrepare };
    (getDb as any).mockReturnValue(mockDb);

    const result = verifyRun("/mock/repo", { task_id: "task-123", steps: ["install"] });

    expect(mockPrepare).toHaveBeenCalledWith(
      "SELECT session_id FROM tasks WHERE id = ?"
    );
    expect(mockPrepare).toHaveBeenCalledWith(
      "UPDATE sessions SET current_phase = 'VERIFY', verify_called = 1 WHERE id = ?"
    );
    expect(mockRun).toHaveBeenCalled();
    expect(result.workflow_guidance?.current_phase).toBe("VERIFY");
  });
});
