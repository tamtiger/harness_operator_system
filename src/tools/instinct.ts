import { randomUUID } from "node:crypto";
import { getDb } from "../db/client.js";

export interface InstinctRecord {
  id: string;
  description: string;
  tags: string[];
  confidence: number;
  ttl_days: number | null;
  created_at: string;
}

export interface InstinctAddResult {
  id: string;
}

export interface InstinctGetResult {
  instincts: InstinctRecord[];
}

export function instinctAdd(
  description: string,
  tags: string[]
): InstinctAddResult {
  const db = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO instincts (id, description, tags, confidence, ttl_days, created_at) VALUES (?, ?, ?, 0.5, NULL, ?)`
  ).run(id, description, JSON.stringify(tags), now);

  return { id };
}

export function instinctGet(tags?: string[]): InstinctGetResult {
  const db = getDb();

  let rows: Array<{
    id: string;
    description: string;
    tags: string;
    confidence: number;
    ttl_days: number | null;
    created_at: string;
  }>;

  if (tags && tags.length > 0) {
    // Filter by tags (any match)
    rows = db
      .prepare(`SELECT * FROM instincts ORDER BY created_at DESC`)
      .all() as typeof rows;

    rows = rows.filter((row) => {
      const rowTags: string[] = JSON.parse(row.tags);
      return tags.some((t) => rowTags.includes(t));
    });
  } else {
    rows = db
      .prepare(`SELECT * FROM instincts ORDER BY created_at DESC`)
      .all() as typeof rows;
  }

  const instincts: InstinctRecord[] = rows.map((row) => ({
    ...row,
    tags: JSON.parse(row.tags) as string[],
  }));

  return { instincts };
}
