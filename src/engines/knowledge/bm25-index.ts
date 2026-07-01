import Database from 'better-sqlite3'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import type { KnowledgeEntry } from '../../types/knowledge.js'

/**
 * BM25 index backed by SQLite FTS5.
 */
export class BM25Index {
  private db: Database.Database

  constructor(dbPath: string) {
    // Ensure directory exists
    const dir = dirname(dbPath)
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

    this.db = new Database(dbPath)
    this.db.pragma('journal_mode = WAL')
    this.init()
  }

  private init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS knowledge (
        id TEXT PRIMARY KEY,
        source_file TEXT NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        tags TEXT NOT NULL DEFAULT '[]',
        content_hash TEXT NOT NULL,
        indexed_at TEXT NOT NULL
      );

      CREATE VIRTUAL TABLE IF NOT EXISTS knowledge_fts USING fts5(
        title,
        content,
        tags,
        content='knowledge',
        content_rowid='rowid'
      );

      CREATE TRIGGER IF NOT EXISTS knowledge_ai AFTER INSERT ON knowledge BEGIN
        INSERT INTO knowledge_fts(rowid, title, content, tags)
        VALUES (new.rowid, new.title, new.content, new.tags);
      END;

      CREATE TRIGGER IF NOT EXISTS knowledge_ad AFTER DELETE ON knowledge BEGIN
        INSERT INTO knowledge_fts(knowledge_fts, rowid, title, content, tags)
        VALUES ('delete', old.rowid, old.title, old.content, old.tags);
      END;

      CREATE TRIGGER IF NOT EXISTS knowledge_au AFTER UPDATE ON knowledge BEGIN
        INSERT INTO knowledge_fts(knowledge_fts, rowid, title, content, tags)
        VALUES ('delete', old.rowid, old.title, old.content, old.tags);
        INSERT INTO knowledge_fts(rowid, title, content, tags)
        VALUES (new.rowid, new.title, new.content, new.tags);
      END;
    `)
  }

  /**
   * Get content hash for a source file (to detect changes).
   */
  getHash(sourceFile: string): string | null {
    const row = this.db.prepare('SELECT content_hash FROM knowledge WHERE source_file = ?').get(sourceFile) as { content_hash: string } | undefined
    return row?.content_hash ?? null
  }

  /**
   * Upsert a knowledge entry.
   */
  upsert(entry: KnowledgeEntry): void {
    const existing = this.db.prepare('SELECT id FROM knowledge WHERE source_file = ?').get(entry.source_file) as { id: string } | undefined

    if (existing) {
      this.db.prepare(`
        UPDATE knowledge SET
          id = ?, type = ?, title = ?, content = ?, tags = ?, content_hash = ?, indexed_at = ?
        WHERE source_file = ?
      `).run(entry.id, entry.type, entry.title, entry.content, JSON.stringify(entry.tags), entry.content_hash, entry.indexed_at, entry.source_file)
    } else {
      this.db.prepare(`
        INSERT INTO knowledge (id, source_file, type, title, content, tags, content_hash, indexed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(entry.id, entry.source_file, entry.type, entry.title, entry.content, JSON.stringify(entry.tags), entry.content_hash, entry.indexed_at)
    }
  }

  /**
   * Remove entries for files that no longer exist.
   */
  removeStale(currentFiles: string[]): number {
    const all = this.db.prepare('SELECT source_file FROM knowledge').all() as { source_file: string }[]
    const currentSet = new Set(currentFiles)
    let removed = 0
    for (const row of all) {
      if (!currentSet.has(row.source_file)) {
        this.db.prepare('DELETE FROM knowledge WHERE source_file = ?').run(row.source_file)
        removed++
      }
    }
    return removed
  }

  /**
   * BM25 search. Returns ranked entries.
   */
  search(query: string, topK: number = 10): KnowledgeEntry[] {
    const rows = this.db.prepare(`
      SELECT k.*, rank
      FROM knowledge_fts fts
      JOIN knowledge k ON k.rowid = fts.rowid
      WHERE knowledge_fts MATCH ?
      ORDER BY rank
      LIMIT ?
    `).all(query, topK) as Array<Record<string, unknown>>

    return rows.map((row) => ({
      id: row['id'] as string,
      source_file: row['source_file'] as string,
      type: row['type'] as KnowledgeEntry['type'],
      title: row['title'] as string,
      content: row['content'] as string,
      tags: JSON.parse(row['tags'] as string) as string[],
      content_hash: row['content_hash'] as string,
      indexed_at: row['indexed_at'] as string,
    }))
  }

  /**
   * Get all entries of a specific type.
   */
  getByType(type: string): KnowledgeEntry[] {
    const rows = this.db.prepare('SELECT * FROM knowledge WHERE type = ?').all(type) as Array<Record<string, unknown>>
    return rows.map((row) => ({
      id: row['id'] as string,
      source_file: row['source_file'] as string,
      type: row['type'] as KnowledgeEntry['type'],
      title: row['title'] as string,
      content: row['content'] as string,
      tags: JSON.parse(row['tags'] as string) as string[],
      content_hash: row['content_hash'] as string,
      indexed_at: row['indexed_at'] as string,
    }))
  }

  /**
   * Get total entry count.
   */
  count(): number {
    const row = this.db.prepare('SELECT COUNT(*) as cnt FROM knowledge').get() as { cnt: number }
    return row.cnt
  }

  close(): void {
    this.db.close()
  }
}
