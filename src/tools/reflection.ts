import { randomUUID } from "node:crypto";
import { getDb } from "../db/client.js";

export interface ReflectionRunResult {
  reflection_id: string;
  metrics: {
    total_tool_calls: number;
    errors_count: number;
    duration_seconds: number;
    repeated_tool_calls: Record<string, number>;
    failed_tools: Array<{ tool: string; error: string; count: number }>;
  };
  suggested_topics: string[];
}

export function reflectionRun(
  sessionId: string,
  taskId?: string,
  trigger: "task_complete" | "task_failed" | "session_handoff" = "session_handoff"
): ReflectionRunResult {
  const db = getDb();

  // 1. Fetch all audit events in SQLite for this session
  const rows = db.prepare("SELECT event_type, payload, created_at FROM audit_events ORDER BY created_at ASC").all() as Array<{
    event_type: string;
    payload: string;
    created_at: string;
  }>;

  const sessionEvents = rows.filter(row => {
    try {
      const payload = JSON.parse(row.payload);
      return payload.session_id === sessionId;
    } catch {
      return false;
    }
  });

  let totalToolCalls = 0;
  let errorsCount = 0;
  let totalDurationMs = 0;
  const toolCallCounts: Record<string, number> = {};
  const failedToolsMap = new Map<string, { tool: string; error: string; count: number }>();

  for (const e of sessionEvents) {
    try {
      const payload = JSON.parse(e.payload);
      const tool = payload.tool;
      if (!tool) continue;

      if (e.event_type === "tool_success" || e.event_type === "tool_error") {
        totalToolCalls++;
        toolCallCounts[tool] = (toolCallCounts[tool] ?? 0) + 1;
        if (typeof payload.duration_ms === "number") {
          totalDurationMs += payload.duration_ms;
        }
      }

      if (e.event_type === "tool_error") {
        errorsCount++;
        const errorMsg = payload.error || "Unknown error";
        const key = `${tool}:${errorMsg}`;
        if (!failedToolsMap.has(key)) {
          failedToolsMap.set(key, { tool, error: errorMsg, count: 0 });
        }
        failedToolsMap.get(key)!.count++;
      }
    } catch {}
  }

  // Repeated tool calls: any tool called > 5 times
  const repeatedToolCalls: Record<string, number> = {};
  for (const [tool, count] of Object.entries(toolCallCounts)) {
    if (count > 5) {
      repeatedToolCalls[tool] = count;
    }
  }

  const failedTools = Array.from(failedToolsMap.values());

  // Suggested topics for instincts / never_again based on errors and high call counts
  const suggestedTopics: string[] = [];
  for (const ft of failedTools) {
    suggestedTopics.push(`${ft.tool} failure: ${ft.error.slice(0, 30)}`);
  }
  for (const tool of Object.keys(repeatedToolCalls)) {
    suggestedTopics.push(`high frequency of ${tool}`);
  }

  const reflectionId = randomUUID();
  const now = new Date().toISOString();

  const metrics = {
    total_tool_calls: totalToolCalls,
    errors_count: errorsCount,
    duration_seconds: Math.round(totalDurationMs / 1000),
    repeated_tool_calls: repeatedToolCalls,
    failed_tools: failedTools
  };

  // Save reflection record in db
  db.prepare(`
    INSERT INTO reflections (id, session_id, task_id, trigger, findings, actions_taken, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    reflectionId,
    sessionId,
    taskId ?? null,
    trigger,
    JSON.stringify(metrics),
    JSON.stringify([]),
    now
  );

  return {
    reflection_id: reflectionId,
    metrics,
    suggested_topics: suggestedTopics
  };
}

import { z } from "zod";

export const mcpTools = [
  {
    name: "reflection_run",
    description: "Retrieve raw tool execution statistics, error frequencies, and patterns from a completed task or session for reflection.",
    inputSchema: {
      session_id: z.string().describe("Session ID to analyze"),
      task_id: z.string().optional().describe("Specific task ID to analyze"),
      trigger: z.enum(["task_complete", "task_failed", "session_handoff"]).describe("Trigger condition for this reflection"),
    },
    handler: async (args: any) => reflectionRun(args.session_id, args.task_id, args.trigger),
  },
];
