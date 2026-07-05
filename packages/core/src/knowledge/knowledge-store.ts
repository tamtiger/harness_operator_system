import { IKnowledgeStore, KnowledgeItem } from '@harness/contracts';
import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

export class SQLiteKnowledgeStore implements IKnowledgeStore {
  public readonly serviceName = 'KnowledgeStore';
  private db?: Database.Database;

  constructor() {}

  public initializeStore(dbPath: string): void {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('busy_timeout = 5000');

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS knowledge_items (
        id TEXT PRIMARY KEY,
        type TEXT,
        source TEXT,
        title TEXT,
        content TEXT,
        tags TEXT,
        updated_at TEXT,
        metadata TEXT
      );
      
      CREATE VIRTUAL TABLE IF NOT EXISTS knowledge_fts USING fts5(
        id UNINDEXED,
        title,
        content,
        tags
      );
    `);
  }

  public saveItems(items: KnowledgeItem[]): void {
    if (!this.db) throw new Error('Database not initialized');

    const insertItem = this.db.prepare(`
      INSERT OR REPLACE INTO knowledge_items (id, type, source, title, content, tags, updated_at, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertFts = this.db.prepare(`
      INSERT OR REPLACE INTO knowledge_fts (id, title, content, tags)
      VALUES (?, ?, ?, ?)
    `);

    const deleteFts = this.db.prepare(`
      DELETE FROM knowledge_fts WHERE id = ?
    `);

    const transaction = this.db.transaction((items: KnowledgeItem[]) => {
      for (const item of items) {
        insertItem.run(
          item.id,
          item.type,
          item.source,
          item.title,
          item.content,
          item.tags.join(','),
          item.updatedAt.toISOString(),
          JSON.stringify(item.metadata || {})
        );

        deleteFts.run(item.id);
        insertFts.run(item.id, item.title, item.content, item.tags.join(','));
      }
    });

    transaction(items);
  }

  public getItems(type?: string): KnowledgeItem[] {
    if (!this.db) throw new Error('Database not initialized');

    let stmt;
    if (type) {
      stmt = this.db.prepare('SELECT * FROM knowledge_items WHERE type = ?');
      return this.mapRows(stmt.all(type));
    } else {
      stmt = this.db.prepare('SELECT * FROM knowledge_items');
      return this.mapRows(stmt.all());
    }
  }

  public getItemById(id: string): KnowledgeItem | undefined {
    if (!this.db) throw new Error('Database not initialized');
    const stmt = this.db.prepare('SELECT * FROM knowledge_items WHERE id = ?');
    const row = stmt.get(id);
    if (!row) return undefined;
    return this.mapRow(row);
  }

  public searchCandidates(query: string): KnowledgeItem[] {
    if (!this.db) throw new Error('Database not initialized');

    const sanitized = this.sanitizeQuery(query);
    if (!sanitized) return [];

    try {
      const stmt = this.db.prepare(`
        SELECT k.* FROM knowledge_items k
        JOIN knowledge_fts f ON k.id = f.id
        WHERE knowledge_fts MATCH ?
      `);
      return this.mapRows(stmt.all(sanitized));
    } catch {
      const stmt = this.db.prepare(`
        SELECT * FROM knowledge_items 
        WHERE title LIKE ? OR content LIKE ?
      `);
      const val = `%${sanitized}%`;
      return this.mapRows(stmt.all(val, val));
    }
  }

  private sanitizeQuery(query: string): string {
    return query.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.trim().length > 0)
      .join(' ');
  }

  public clear(): void {
    if (!this.db) throw new Error('Database not initialized');
    this.db.exec(`
      DELETE FROM knowledge_items;
      DELETE FROM knowledge_fts;
    `);
  }

  public async dispose(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = undefined;
    }
  }

  private mapRows(rows: any[]): KnowledgeItem[] {
    return rows.map(r => this.mapRow(r));
  }

  private mapRow(row: any): KnowledgeItem {
    return {
      id: row.id,
      type: row.type,
      source: row.source,
      title: row.title,
      content: row.content,
      tags: row.tags ? row.tags.split(',') : [],
      updatedAt: new Date(row.updated_at),
      metadata: row.metadata ? JSON.parse(row.metadata) : {}
    };
  }
}
