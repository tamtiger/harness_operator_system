import { getDb } from "../db/client.js";
import { appendAuditJsonl } from "../db/audit.js";
import { z } from "zod";

export interface AuditLogResult {
  ok: true;
  event_id: number;
}

export interface HarnessStatusResult {
  active_session: { id: string; repo_path: string; started_at: string } | null;
  pending_tasks: number;
  last_verify: string | null;
  recent_instincts: Array<{ description: string; tags: string; created_at: string }>;
}

export function auditLog(
  eventType: string,
  payload: unknown
): AuditLogResult {
  const db = getDb();
  const now = new Date().toISOString();

  const result = db
    .prepare
    (
      `INSERT INTO audit_events (event_type, payload, created_at) VALUES (?, ?, ?)`
    )
    .run(eventType, JSON.stringify(payload), now);

  // Also append to JSONL
  appendAuditJsonl({ event_type: eventType, payload, timestamp: now });

  return { ok: true, event_id: result.lastInsertRowid as number };
}

export function harnessStatus(repoPath?: string): HarnessStatusResult {
  const db = getDb();

  // Active session
  let activeSession: HarnessStatusResult["active_session"] = null;
  if (repoPath) {
    const session = db
      .prepare
      (
        `SELECT id, repo_path, started_at FROM sessions WHERE status = 'active' AND repo_path = ? ORDER BY started_at DESC LIMIT 1`
      )
      .get(repoPath) as { id: string; repo_path: string; started_at: string } | undefined;
    if (session) activeSession = session;
  } else {
    const session = db
      .prepare
      (
        `SELECT id, repo_path, started_at FROM sessions WHERE status = 'active' ORDER BY started_at DESC LIMIT 1`
      )
      .get() as { id: string; repo_path: string; started_at: string } | undefined;
    if (session) activeSession = session;
  }

  // Pending tasks count
  const pendingRow = db
    .prepare(`SELECT COUNT(*) as count FROM tasks WHERE status = 'pending'`)
    .get() as { count: number };
  const pendingTasks = pendingRow.count;

  // Last verify event
  const lastVerify = db
    .prepare
    (
      `SELECT created_at FROM audit_events WHERE event_type = 'verify_run' ORDER BY created_at DESC LIMIT 1`
    )
    .get() as { created_at: string } | undefined;

  // Recent instincts (last 5)
  const recentInstincts = db
    .prepare
    (
      `SELECT description, tags, created_at FROM instincts ORDER BY created_at DESC LIMIT 5`
    )
    .all() as Array<{ description: string; tags: string; created_at: string }>;

  return {
    active_session: activeSession,
    pending_tasks: pendingTasks,
    last_verify: lastVerify?.created_at ?? null,
    recent_instincts: recentInstincts,
  };
}

export const mcpTools = [
  {
    name: "harness_status",
    description: "Get current harness status: active session, pending tasks, last verify, recent instincts.",
    inputSchema: {
      repo_path: z.string().optional().describe("Path to the repo"),
    },
    handler: async (args: any) => harnessStatus(args.repo_path),
  },
];
