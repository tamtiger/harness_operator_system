import { z } from "zod";
import { getDb } from "../db/client.js";
import { skillLoad } from "./skill.js";

export interface SessionWorkflowState {
  sessionStarted: boolean;
  taskCreated: boolean;
  skillsLoaded: string[];
  progressLogged: boolean;
  verifyExecuted: boolean;
  verifyPassed: boolean;
  handoffCreated: boolean;
  completedSteps: string[];
}

export interface ComplianceCheckResult {
  score: number;
  missingActions: string[];
  missingVerifiableEvidence: string[];
  status: "PASS" | "FAIL";
}

export function getWorkflowStatus(sessionId: string): SessionWorkflowState & { complianceScore: number } {
  const db = getDb();

  // 1. Check if session exists
  const session = db.prepare("SELECT id, verify_called, verify_passed FROM sessions WHERE id = ?").get(sessionId) as
    | { id: string; verify_called: number; verify_passed: number }
    | undefined;

  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  // 2. Check if tasks created
  const tasksCountRow = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE session_id = ?").get(sessionId) as { count: number };
  const taskCreated = tasksCountRow.count > 0;

  // 3. Check skills loaded
  const skillEvents = db.prepare(`
    SELECT json_extract(payload, '$.args.name') as skill_name
    FROM audit_events
    WHERE json_extract(payload, '$.session_id') = ?
      AND event_type = 'tool_success'
      AND json_extract(payload, '$.tool') = 'skill_load'
  `).all(sessionId) as Array<{ skill_name: string | null }>;
  const skillsLoaded = Array.from(new Set(skillEvents.map(e => e.skill_name).filter((name): name is string => typeof name === "string")));

  // 4. Check progress logged
  const progressEventsRow = db.prepare(`
    SELECT COUNT(*) as count FROM audit_events
    WHERE json_extract(payload, '$.session_id') = ?
      AND event_type = 'tool_success'
      AND json_extract(payload, '$.tool') = 'progress_log'
  `).get(sessionId) as { count: number };
  const progressLogged = progressEventsRow.count > 0;

  // 5. Verify executed & passed
  const verifyExecuted = session.verify_called > 0;
  const verifyPassed = session.verify_passed > 0;

  // 6. Check handoff created
  const handoffRow = db.prepare(`
    SELECT COUNT(*) as count FROM audit_events
    WHERE json_extract(payload, '$.session_id') = ?
      AND event_type = 'tool_success'
      AND json_extract(payload, '$.tool') = 'session_handoff'
  `).get(sessionId) as { count: number };
  const handoffCreated = handoffRow.count > 0;

  const completedSteps: string[] = ["session_start"];
  if (taskCreated) completedSteps.push("task_create");
  if (skillsLoaded.length > 0) completedSteps.push("skill_load");
  if (progressLogged) completedSteps.push("progress_log");
  if (verifyExecuted) completedSteps.push("verify_run");
  if (handoffCreated) completedSteps.push("session_handoff");

  // Calculate score
  const check = complianceCheck(sessionId);

  return {
    sessionStarted: true,
    taskCreated,
    skillsLoaded,
    progressLogged,
    verifyExecuted,
    verifyPassed,
    handoffCreated,
    completedSteps,
    complianceScore: check.score,
  };
}

export function complianceCheck(sessionId: string): ComplianceCheckResult {
  const db = getDb();

  const session = db.prepare("SELECT id, repo_path, verify_called, verify_passed FROM sessions WHERE id = ?").get(sessionId) as
    | { id: string; repo_path: string; verify_called: number; verify_passed: number }
    | undefined;

  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  // 1. Points for session_start (always 15 since session exists)
  let score = 15;
  const missingActions: string[] = [];
  const missingVerifiableEvidence: string[] = [];

  // 2. Points for task_create (15 points)
  const tasksCountRow = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE session_id = ?").get(sessionId) as { count: number };
  const taskCreated = tasksCountRow.count > 0;
  if (taskCreated) {
    score += 15;
  } else {
    missingActions.push("task_create");
  }

  // 3. Points for progress_log (15 points) - progress_log must have non-empty content
  const progressEvents = db.prepare(`
    SELECT payload FROM audit_events
    WHERE json_extract(payload, '$.session_id') = ?
      AND event_type = 'tool_success'
      AND json_extract(payload, '$.tool') = 'progress_log'
  `).all(sessionId) as Array<{ payload: string }>;

  let progressLogged = false;
  for (const event of progressEvents) {
    try {
      const parsed = JSON.parse(event.payload);
      const args = parsed.args;
      if (args && args.summary && args.summary.trim().length > 0) {
        progressLogged = true;
        break;
      }
    } catch {}
  }

  if (progressLogged) {
    score += 15;
  } else {
    missingActions.push("progress_log");
  }

  // 4. Points for verify_run (25 points) - ONLY if verifyPassed is true
  const verifyPassed = session.verify_passed > 0;
  if (verifyPassed) {
    score += 25;
  } else {
    missingActions.push("verify_run");
    missingVerifiableEvidence.push("verify_exit_code");
  }

  // 5. Points for session_handoff (15 points)
  const handoffRow = db.prepare(`
    SELECT COUNT(*) as count FROM audit_events
    WHERE json_extract(payload, '$.session_id') = ?
      AND event_type = 'tool_success'
      AND json_extract(payload, '$.tool') = 'session_handoff'
  `).get(sessionId) as { count: number };
  const handoffCreated = handoffRow.count > 0;
  if (handoffCreated) {
    score += 15;
  } else {
    missingActions.push("session_handoff");
  }

  // 6. Action-based Scoring for Loaded Skills
  const skillEvents = db.prepare(`
    SELECT DISTINCT json_extract(payload, '$.args.name') as skill_name
    FROM audit_events
    WHERE json_extract(payload, '$.session_id') = ?
      AND event_type = 'tool_success'
      AND json_extract(payload, '$.tool') = 'skill_load'
  `).all(sessionId) as Array<{ skill_name: string | null }>;
  const skillsLoaded = Array.from(new Set(skillEvents.map(e => e.skill_name).filter((name): name is string => typeof name === "string")));

  // Verify side-effects in database
  const verifySuccessEvents = db.prepare(`
    SELECT payload FROM audit_events
    WHERE json_extract(payload, '$.session_id') = ?
      AND event_type = 'tool_success'
      AND json_extract(payload, '$.tool') = 'verify_run'
  `).all(sessionId) as Array<{ payload: string }>;

  let hasDiffCaptured = false;
  let hasVerifyExitCode = false;
  for (const event of verifySuccessEvents) {
    try {
      const parsed = JSON.parse(event.payload);
      const result = parsed.result;
      if (result && result.diff_captured) {
        hasDiffCaptured = true;
      }
      if (result && result.verify_exit_code !== undefined) {
        hasVerifyExitCode = true;
      }
    } catch {}
  }

  let totalClassABSkills = 0;
  let compliantClassABSkills = 0;

  for (const skillName of skillsLoaded) {
    const loaded = skillLoad(skillName, session.repo_path);
    if (!loaded || "error" in loaded) continue;

    const meta = loaded.meta;
    const actionMap = meta?.action_map || meta?.metadata?.action_map;
    const steps = meta?.steps || meta?.metadata?.steps;

    let allRequiredToolsCalled = true;

    // Legacy action_map support
    if (actionMap && typeof actionMap === "object") {
      for (const [actionName, actionConfig] of Object.entries(actionMap)) {
        const val = actionConfig as any;
        if (val && typeof val === "object" && val.tool) {
          const toolName = val.tool;
          const isRequired = val.required !== false;

          if (isRequired) {
            const calledRow = db.prepare(`
              SELECT COUNT(*) as count FROM audit_events
              WHERE json_extract(payload, '$.session_id') = ?
                AND event_type = 'tool_success'
                AND json_extract(payload, '$.tool') = ?
            `).get(sessionId, toolName) as { count: number };

            if (calledRow.count === 0) {
              allRequiredToolsCalled = false;
              missingActions.push(`${skillName}:${toolName}`);
            }
          }
        }
      }
    }

    // New steps array support
    if (Array.isArray(steps)) {
      for (const step of steps) {
        if (step.type === "action_mappable" && step.required_tool) {
          const calledRow = db.prepare(`
            SELECT COUNT(*) as count FROM audit_events
            WHERE json_extract(payload, '$.session_id') = ?
              AND event_type = 'tool_success'
              AND json_extract(payload, '$.tool') = ?
          `).get(sessionId, step.required_tool) as { count: number };

          if (calledRow.count === 0) {
            allRequiredToolsCalled = false;
            missingActions.push(`${skillName}:${step.required_tool}`);
          }

          // Check sequence if order is defined e.g. "before(verify_run)"
          if (step.order && typeof step.order === "string") {
            const match = step.order.match(/^before\((.+)\)$/);
            if (match) {
              const targetTool = match[1];
              const events = db.prepare(`
                SELECT json_extract(payload, '$.tool') as tool, created_at
                FROM audit_events
                WHERE json_extract(payload, '$.session_id') = ?
                  AND event_type = 'tool_success'
                  AND json_extract(payload, '$.tool') IN (?, ?)
                ORDER BY created_at ASC
              `).all(sessionId, step.required_tool, targetTool) as Array<{ tool: string | null; created_at: string }>;
              
              const firstTarget = events.findIndex(e => e.tool === targetTool);
              const firstRequired = events.findIndex(e => e.tool === step.required_tool);
              
              if (firstTarget !== -1 && (firstRequired === -1 || firstRequired > firstTarget)) {
                allRequiredToolsCalled = false;
                missingVerifiableEvidence.push(`sequence_violation: ${step.required_tool} must run before ${targetTool}`);
              }
            }
          }
        } else if (step.type === "narrative_gated" && step.gate_field) {
          const narrativeRow = db.prepare(`
            SELECT COUNT(*) as count FROM audit_events
            WHERE json_extract(payload, '$.session_id') = ?
              AND event_type = 'tool_success'
              AND json_extract(payload, '$.tool') = 'skill_narrative_submit'
              AND json_extract(payload, '$.args.field') = ?
          `).get(sessionId, step.gate_field) as { count: number };
          
          if (narrativeRow.count === 0) {
            allRequiredToolsCalled = false;
            missingActions.push(`narrative_gate:${step.gate_field}`);
          }
        }
      }
    }

    if (actionMap || Array.isArray(steps)) {
      // Check required verifiable evidence for this skill
      const reqEvidence = meta?.required_verifiable_evidence || meta?.metadata?.required_verifiable_evidence;
      if (Array.isArray(reqEvidence)) {
        for (const ev of reqEvidence) {
          if (ev === "diff_captured" && !hasDiffCaptured) {
            allRequiredToolsCalled = false;
            missingVerifiableEvidence.push(`${skillName}:diff_captured`);
          }
          if (ev === "verify_exit_code" && !hasVerifyExitCode) {
            allRequiredToolsCalled = false;
            missingVerifiableEvidence.push(`${skillName}:verify_exit_code`);
          }
        }
      }

      const weight = Number(meta?.compliance_weight || meta?.metadata?.compliance_weight || 15);
      totalClassABSkills += weight;

      if (allRequiredToolsCalled) {
        compliantClassABSkills += weight;
      }
    }
  }

  let skillScore = 0;
  if (totalClassABSkills > 0) {
    skillScore = Math.round((compliantClassABSkills / totalClassABSkills) * 15);
  }
  score += skillScore;

  // 7. Workflow Sequence Validation
  const successEvents = db.prepare(`
    SELECT json_extract(payload, '$.tool') as tool, created_at
    FROM audit_events
    WHERE json_extract(payload, '$.session_id') = ?
      AND event_type = 'tool_success'
    ORDER BY created_at ASC
  `).all(sessionId) as Array<{ tool: string | null; created_at: string }>;

  const firstVerifyIndex = successEvents.findIndex(e => e.tool === "verify_run");
  const firstScopeCheckIndex = successEvents.findIndex(e => e.tool === "scope_check");

  let sequenceViolation = false;
  if (firstVerifyIndex !== -1 && (firstScopeCheckIndex === -1 || firstScopeCheckIndex > firstVerifyIndex)) {
    sequenceViolation = true;
    missingVerifiableEvidence.push("sequence_violation: scope_check must run before verify_run");
  }

  // Status is PASS if verifyPassed is true AND score >= 55 AND no sequence violation
  const status = (verifyPassed && score >= 55 && !sequenceViolation) ? "PASS" : "FAIL";

  return {
    score,
    missingActions,
    missingVerifiableEvidence,
    status,
  };
}

export const mcpTools = [
  {
    name: "workflow_status",
    description: "Get session workflow state and compliance score.",
    inputSchema: {
      session_id: z.string().describe("Session ID"),
    },
    handler: async (args: any) => getWorkflowStatus(args.session_id),
  },
  {
    name: "compliance_check",
    description: "Check compliance details, score, and pass/fail status.",
    inputSchema: {
      session_id: z.string().describe("Session ID"),
    },
    handler: async (args: any) => complianceCheck(args.session_id),
  },
];
