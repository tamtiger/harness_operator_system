import { describe, it, expect } from "vitest";
import { classifyWorkflow } from "./router.js";

describe("Workflow Router", () => {
  it("should classify as Full if scope is '*'", () => {
    expect(classifyWorkflow("/repo", "test", "*")).toBe("Full");
  });

  it("should classify as Quick if small scope and no sensitive paths", () => {
    expect(classifyWorkflow("/repo", "Fix typo", "src/index.ts")).toBe("Quick");
  });

  it("should classify as Full if scope touches more than 2 files", () => {
    expect(classifyWorkflow("/repo", "Update", "a.ts, b.ts, c.ts")).toBe("Full");
  });

  it("should classify as Full if sensitive paths are in scope", () => {
    expect(classifyWorkflow("/repo", "Update", "src/auth.ts")).toBe("Full");
    expect(classifyWorkflow("/repo", "Update", "src/db/migrations/1.ts")).toBe("Full");
  });

  it("should classify as Full if title implies sensitive changes", () => {
    expect(classifyWorkflow("/repo", "Fix security bug", "src/index.ts")).toBe("Full");
  });
});
