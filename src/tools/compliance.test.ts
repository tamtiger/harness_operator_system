import { describe, it, expect, vi, beforeEach } from "vitest";
import { getWorkflowStatus, complianceCheck } from "./compliance.js";
import { getDb } from "../db/client.js";
import { skillLoad } from "./skill.js";

vi.mock("../db/client.js", () => ({
  getDb: vi.fn(),
}));

vi.mock("./skill.js", () => ({
  skillLoad: vi.fn().mockImplementation((name) => {
    if (name === "harness-workflow") {
      return {
        name: "harness-workflow",
        content: "...",
        meta: {
          name: "harness-workflow",
          action_map: {
            session_start: { tool: "session_start", required: true },
            verify_run: { tool: "verify_run", required: true },
            session_handoff: { tool: "session_handoff", required: true },
          },
        },
      };
    }
    if (name === "systematic-diagnosis") {
      return {
        name: "systematic-diagnosis",
        content: "...",
        meta: {
          name: "systematic-diagnosis",
          action_map: {
            gather_evidence: { tool: "code_search", required: true },
            validate_fix: { tool: "verify_run", required: true },
          },
          required_verifiable_evidence: ["diff_captured", "verify_exit_code"],
        },
      };
    }
    if (name === "steps-skill") {
      return {
        name: "steps-skill",
        content: "...",
        meta: {
          name: "steps-skill",
          steps: [
            { id: "s1", type: "action_mappable", required_tool: "verify_run", order: "before(session_handoff)" },
            { id: "s2", type: "narrative_gated", gate_field: "root_cause" }
          ],
          compliance_weight: 15,
        },
      };
    }
    return { error: "not found" };
  }),
  skillList: vi.fn(),
  skillSuggest: vi.fn(),
  skillCreateFromSession: vi.fn(),
}));

describe("compliance tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws error if session not found", () => {
    const mockDb = {
      prepare: vi.fn().mockImplementation((query) => {
        if (query.includes("SELECT id, repo_path")) {
          return { get: () => undefined };
        }
        if (query.includes("SELECT id, verify_called")) {
          return { get: () => undefined };
        }
        return { get: () => ({ count: 0 }), all: () => [] };
      }),
    };
    (getDb as any).mockReturnValue(mockDb);

    expect(() => complianceCheck("sess-123")).toThrow("Session not found: sess-123");
    expect(() => getWorkflowStatus("sess-123")).toThrow("Session not found: sess-123");
  });

  it("returns FAIL status and base score when only session started", () => {
    const mockDb = {
      prepare: vi.fn().mockImplementation((query) => {
        if (query.includes("SELECT id, repo_path")) {
          return { get: () => ({ id: "sess-123", repo_path: "/repo", verify_called: 0, verify_passed: 0 }) };
        }
        if (query.includes("SELECT id, verify_called")) {
          return { get: () => ({ id: "sess-123", verify_called: 0, verify_passed: 0 }) };
        }
        if (query.includes("SELECT COUNT(*) as count FROM tasks")) {
          return { get: () => ({ count: 0 }) };
        }
        if (query.includes("SELECT COUNT(*) as count FROM audit_events")) {
          return { get: () => ({ count: 0 }) };
        }
        if (query.includes("SELECT json_extract")) {
          return { all: () => [] };
        }
        if (query.includes("SELECT payload FROM audit_events")) {
          return { all: () => [] };
        }
        return { get: () => ({ count: 0 }), all: () => [] };
      }),
    };
    (getDb as any).mockReturnValue(mockDb);

    const checkRes = complianceCheck("sess-123");
    expect(checkRes.score).toBe(15); // only session_start (15)
    expect(checkRes.status).toBe("FAIL");
    expect(checkRes.missingActions).toContain("task_create");
    expect(checkRes.missingActions).toContain("verify_run");

    const statusRes = getWorkflowStatus("sess-123");
    expect(statusRes.sessionStarted).toBe(true);
    expect(statusRes.taskCreated).toBe(false);
    expect(statusRes.complianceScore).toBe(15);
  });

  it("returns PASS status when verifyPassed is true and score is >= 55 (No Class A/B skills loaded)", () => {
    const mockDb = {
      prepare: vi.fn().mockImplementation((query) => {
        if (query.includes("SELECT id, repo_path")) {
          return { get: () => ({ id: "sess-123", repo_path: "/repo", verify_called: 1, verify_passed: 1 }) };
        }
        if (query.includes("SELECT id, verify_called")) {
          return { get: () => ({ id: "sess-123", verify_called: 1, verify_passed: 1 }) };
        }
        if (query.includes("SELECT COUNT(*) as count FROM tasks")) {
          return { get: () => ({ count: 1 }) }; // task_create (15)
        }
        if (query.includes("json_extract(payload, '$.tool') = 'progress_log'")) {
          return { all: () => [{ payload: JSON.stringify({ args: { summary: "Doing something" } }) }] }; // progress_log (15)
        }
        if (query.includes("json_extract(payload, '$.tool') = 'skill_load'")) {
          return { all: () => [] }; // no skills loaded
        }
        if (query.includes("json_extract(payload, '$.tool') = 'session_handoff'")) {
          return { get: () => ({ count: 0 }) }; // no handoff yet
        }
        if (query.includes("json_extract(payload, '$.tool') = 'verify_run'")) {
          return { all: () => [] };
        }
        return { get: () => ({ count: 0 }), all: () => [] };
      }),
    };
    (getDb as any).mockReturnValue(mockDb);

    const checkRes = complianceCheck("sess-123");
    // session_start (15) + task_create (15) + progress_log (15) + verify_run passed (25) = 70 points
    expect(checkRes.score).toBe(70);
    expect(checkRes.status).toBe("PASS");
    expect(checkRes.missingActions).toEqual(["session_handoff"]);
  });

  it("returns PASS and 100 points when all steps + skill action maps are completed", () => {
    const mockDb = {
      prepare: vi.fn().mockImplementation((query) => {
        if (query.includes("SELECT id, repo_path")) {
          return { get: () => ({ id: "sess-123", repo_path: "/repo", verify_called: 1, verify_passed: 1 }) };
        }
        if (query.includes("SELECT id, verify_called")) {
          return { get: () => ({ id: "sess-123", verify_called: 1, verify_passed: 1 }) };
        }
        if (query.includes("SELECT COUNT(*) as count FROM tasks")) {
          return { get: () => ({ count: 1 }) }; // task_create (15)
        }
        if (query.includes("json_extract(payload, '$.tool') = 'progress_log'")) {
          return { all: () => [{ payload: JSON.stringify({ args: { summary: "Doing something" } }) }] }; // progress_log (15)
        }
        if (query.includes("json_extract(payload, '$.tool') = 'skill_load'")) {
          return { all: () => [{ skill_name: "harness-workflow" }] }; // Loaded Class A skill
        }
        if (query.includes("json_extract(payload, '$.tool') = 'session_handoff'")) {
          return { get: () => ({ count: 1 }) }; // session_handoff (15)
        }
        if (query.includes("json_extract(payload, '$.tool') = 'session_start'")) {
          return { get: () => ({ count: 1 }) }; // session_start called (required by action_map)
        }
        if (query.includes("json_extract(payload, '$.tool') = 'verify_run'")) {
          // verify_run success (required by action_map)
          return {
            get: () => ({ count: 1 }),
            all: () => [{ payload: JSON.stringify({ result: { diff_captured: "some diff", verify_exit_code: 0 } }) }]
          };
        }
        return { get: () => ({ count: 1 }), all: () => [] };
      }),
    };
    (getDb as any).mockReturnValue(mockDb);

    const checkRes = complianceCheck("sess-123");
    // session_start (15) + task_create (15) + progress_log (15) + verify_run (25) + session_handoff (15) + skill action map (15) = 100
    expect(checkRes.score).toBe(100);
    expect(checkRes.status).toBe("PASS");
    expect(checkRes.missingActions).toEqual([]);
  });

  it("fails compliance when sequence validation is violated", () => {
    const mockDb = {
      prepare: vi.fn().mockImplementation((query) => {
        if (query.includes("SELECT id, repo_path")) {
          return { get: () => ({ id: "sess-123", repo_path: "/repo", verify_called: 1, verify_passed: 1 }) };
        }
        if (query.includes("SELECT id, verify_called")) {
          return { get: () => ({ id: "sess-123", verify_called: 1, verify_passed: 1 }) };
        }
        if (query.includes("SELECT COUNT(*) as count FROM tasks")) {
          return { get: () => ({ count: 1 }) };
        }
        if (query.includes("json_extract(payload, '$.tool') = 'progress_log'")) {
          return { all: () => [{ payload: JSON.stringify({ args: { summary: "Doing something" } }) }] };
        }
        if (query.includes("json_extract(payload, '$.tool') = 'skill_load'")) {
          return { all: () => [] };
        }
        if (query.includes("json_extract(payload, '$.tool') = 'session_handoff'")) {
          return { get: () => ({ count: 1 }) };
        }
        if (query.includes("SELECT json_extract(payload, '$.tool') as tool")) {
          // verify_run happened before scope_check or scope_check missing
          return {
            all: () => [
              { tool: "session_start" },
              { tool: "verify_run" },
              { tool: "scope_check" }
            ]
          };
        }
        return { get: () => ({ count: 1 }), all: () => [] };
      }),
    };
    (getDb as any).mockReturnValue(mockDb);

    const checkRes = complianceCheck("sess-123");
    expect(checkRes.status).toBe("FAIL");
    expect(checkRes.missingVerifiableEvidence).toContain("sequence_violation: scope_check must run before verify_run");
  });

  it("validates steps array (action_mappable sequence and narrative_gated)", () => {
    const mockDb = {
      prepare: vi.fn().mockImplementation((query) => {
        if (query.includes("SELECT id, repo_path")) return { get: () => ({ id: "sess-123", repo_path: "/repo", verify_called: 1, verify_passed: 1 }) };
        if (query.includes("SELECT id, verify_called")) return { get: () => ({ id: "sess-123", verify_called: 1, verify_passed: 1 }) };
        if (query.includes("SELECT COUNT(*) as count FROM tasks")) return { get: () => ({ count: 1 }) };
        if (query.includes("json_extract(payload, '$.tool') = 'progress_log'")) return { all: () => [{ payload: JSON.stringify({ args: { summary: "Doing something" } }) }] };
        if (query.includes("json_extract(payload, '$.tool') = 'skill_load'")) return { all: () => [{ skill_name: "steps-skill" }] };
        if (query.includes("json_extract(payload, '$.tool') = 'session_handoff'")) return { get: () => ({ count: 1 }) };
        
        // Narrative gate check
        if (query.includes("json_extract(payload, '$.args.field') = ?")) {
          return { get: () => ({ count: 0 }) }; // missing narrative
        }

        // action_mappable checks
        if (query.includes("json_extract(payload, '$.tool') IN (?, ?)")) {
           // return out-of-order sequence: handoff before verify
           return {
             all: () => [
               { tool: "session_handoff", created_at: "1" },
               { tool: "verify_run", created_at: "2" }
             ]
           };
        }

        if (query.includes("SELECT json_extract(payload, '$.tool') as tool")) {
           return { all: () => [] };
        }

        return { get: () => ({ count: 1 }), all: () => [] };
      }),
    };
    (getDb as any).mockReturnValue(mockDb);

    const checkRes = complianceCheck("sess-123");
    expect(checkRes.missingActions).toContain("narrative_gate:root_cause");
    expect(checkRes.missingVerifiableEvidence).toContain("sequence_violation: verify_run must run before session_handoff");
  });
});
