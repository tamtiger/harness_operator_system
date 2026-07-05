import { ICodeIndex, SymbolNode, SymbolRelation, IWorkspaceManager } from '@harness/contracts';
import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export class CodeIndexer implements ICodeIndex {
  public readonly serviceName = 'CodeIndex';
  private db?: Database.Database;

  constructor(private readonly workspace: IWorkspaceManager) {}

  public async initialize(): Promise<void> {
    let dbPath = this.workspace.getDatabaseDir();
    if (dbPath !== ':memory:') {
      dbPath = path.join(dbPath, 'harness.db');
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS symbols (
        project_id TEXT,
        id TEXT,
        language TEXT,
        namespace TEXT,
        name TEXT,
        kind TEXT,
        file_path TEXT,
        start_line INTEGER,
        start_col INTEGER,
        end_line INTEGER,
        end_col INTEGER,
        modifiers TEXT,
        parent_id TEXT,
        hash TEXT,
        documentation TEXT,
        PRIMARY KEY (project_id, id)
      );

      CREATE TABLE IF NOT EXISTS relations (
        project_id TEXT,
        from_id TEXT,
        to_id TEXT,
        type TEXT,
        PRIMARY KEY (project_id, from_id, to_id, type)
      );

      CREATE INDEX IF NOT EXISTS idx_symbols_file ON symbols(project_id, file_path);
      CREATE INDEX IF NOT EXISTS idx_relations_to ON relations(project_id, to_id);
    `);
  }

  public async indexFile(filePath: string, content: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const cleanPath = filePath.replace(/\\/g, '/');
    await this.removeFile(cleanPath);

    const hash = crypto.createHash('md5').update(content).digest('hex');
    const ext = path.extname(cleanPath);
    
    let symbols: SymbolNode[] = [];
    let relations: SymbolRelation[] = [];

    if (ext === '.cs') {
      const parsed = this.parseCSharp(cleanPath, content, hash);
      symbols = parsed.symbols;
      relations = parsed.relations;
    } else if (ext === '.ts' || ext === '.js') {
      const parsed = this.parseJavaScript(cleanPath, content, hash);
      symbols = parsed.symbols;
      relations = parsed.relations;
    }

    if (symbols.length === 0) return;

    const projectPath = this.workspace.getProjectRoot().replace(/\\/g, '/');
    const projectId = crypto.createHash('md5').update(projectPath).digest('hex').substring(0, 12);

    const insertSymbol = this.db.prepare(`
      INSERT OR REPLACE INTO symbols (project_id, id, language, namespace, name, kind, file_path, start_line, start_col, end_line, end_col, modifiers, parent_id, hash, documentation)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertRelation = this.db.prepare(`
      INSERT OR REPLACE INTO relations (project_id, from_id, to_id, type)
      VALUES (?, ?, ?, ?)
    `);

    const tx = this.db.transaction(() => {
      for (const s of symbols) {
        insertSymbol.run(
          projectId,
          s.id,
          s.language,
          s.namespace,
          s.name,
          s.kind,
          s.filePath,
          s.range.startLine,
          s.range.startCol,
          s.range.endLine,
          s.range.endCol,
          s.modifiers.join(','),
          s.parentId || null,
          s.hash,
          s.documentation || null
        );
      }
      for (const r of relations) {
        insertRelation.run(projectId, r.fromId, r.toId, r.type);
      }
    });

    tx();
  }

  public async removeFile(filePath: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const cleanPath = filePath.replace(/\\/g, '/');
    const projectPath = this.workspace.getProjectRoot().replace(/\\/g, '/');
    const projectId = crypto.createHash('md5').update(projectPath).digest('hex').substring(0, 12);

    const getSymbols = this.db.prepare('SELECT id FROM symbols WHERE project_id = ? AND file_path = ?');
    const rows = getSymbols.all(projectId, cleanPath) as { id: string }[];
    const ids = rows.map(r => r.id);

    if (ids.length === 0) return;

    const deleteSymbols = this.db.prepare('DELETE FROM symbols WHERE project_id = ? AND file_path = ?');
    const deleteRelationsFrom = this.db.prepare('DELETE FROM relations WHERE project_id = ? AND from_id = ?');
    const deleteRelationsTo = this.db.prepare('DELETE FROM relations WHERE project_id = ? AND to_id = ?');

    const tx = this.db.transaction(() => {
      deleteSymbols.run(projectId, cleanPath);
      for (const id of ids) {
        deleteRelationsFrom.run(projectId, id);
        deleteRelationsTo.run(projectId, id);
      }
    });

    tx();
  }

  public async findSymbol(id: string): Promise<SymbolNode | undefined> {
    if (!this.db) throw new Error('Database not initialized');
    const projectPath = this.workspace.getProjectRoot().replace(/\\/g, '/');
    const projectId = crypto.createHash('md5').update(projectPath).digest('hex').substring(0, 12);
    const stmt = this.db.prepare('SELECT * FROM symbols WHERE project_id = ? AND id = ?');
    const row = stmt.get(projectId, id);
    return row ? this.mapRow(row) : undefined;
  }

  public async findReferences(symbolId: string): Promise<SymbolRelation[]> {
    if (!this.db) throw new Error('Database not initialized');
    const projectPath = this.workspace.getProjectRoot().replace(/\\/g, '/');
    const projectId = crypto.createHash('md5').update(projectPath).digest('hex').substring(0, 12);
    const stmt = this.db.prepare("SELECT * FROM relations WHERE project_id = ? AND to_id = ? AND type = 'calls'");
    const rows = stmt.all(projectId, symbolId) as any[];
    return rows.map(r => ({
      fromId: r.from_id,
      toId: r.to_id,
      type: r.type
    }));
  }

  public async findImplementations(interfaceId: string): Promise<SymbolNode[]> {
    if (!this.db) throw new Error('Database not initialized');
    const projectPath = this.workspace.getProjectRoot().replace(/\\/g, '/');
    const projectId = crypto.createHash('md5').update(projectPath).digest('hex').substring(0, 12);
    const stmt = this.db.prepare(`
      SELECT s.* FROM symbols s
      JOIN relations r ON s.project_id = r.project_id AND s.id = r.from_id
      WHERE s.project_id = ? AND r.to_id = ? AND r.type = 'implements'
    `);
    return (stmt.all(projectId, interfaceId) as any[]).map(r => this.mapRow(r));
  }

  public async findDerivedTypes(classId: string): Promise<SymbolNode[]> {
    if (!this.db) throw new Error('Database not initialized');
    const projectPath = this.workspace.getProjectRoot().replace(/\\/g, '/');
    const projectId = crypto.createHash('md5').update(projectPath).digest('hex').substring(0, 12);
    const stmt = this.db.prepare(`
      SELECT s.* FROM symbols s
      JOIN relations r ON s.project_id = r.project_id AND s.id = r.from_id
      WHERE s.project_id = ? AND r.to_id = ? AND r.type = 'inherits'
    `);
    return (stmt.all(projectId, classId) as any[]).map(r => this.mapRow(r));
  }

  public async findFileSymbols(filePath: string): Promise<SymbolNode[]> {
    if (!this.db) throw new Error('Database not initialized');
    const cleanPath = filePath.replace(/\\/g, '/');
    const projectPath = this.workspace.getProjectRoot().replace(/\\/g, '/');
    const projectId = crypto.createHash('md5').update(projectPath).digest('hex').substring(0, 12);
    const stmt = this.db.prepare('SELECT * FROM symbols WHERE project_id = ? AND file_path = ?');
    return (stmt.all(projectId, cleanPath) as any[]).map(r => this.mapRow(r));
  }

  public async dispose(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = undefined;
    }
  }

  private mapRow(r: any): SymbolNode {
    return {
      id: r.id,
      language: r.language,
      namespace: r.namespace,
      name: r.name,
      kind: r.kind,
      filePath: r.file_path,
      range: {
        startLine: r.start_line,
        startCol: r.start_col,
        endLine: r.end_line,
        endCol: r.end_col
      },
      modifiers: r.modifiers ? r.modifiers.split(',') : [],
      parentId: r.parent_id || undefined,
      hash: r.hash,
      documentation: r.documentation || undefined
    };
  }

  private parseCSharp(filePath: string, content: string, hash: string) {
    const symbols: SymbolNode[] = [];
    const relations: SymbolRelation[] = [];
    const lines = content.split('\n');

    let namespace = 'Global';
    let currentClassId: string | undefined = undefined;

    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx];
      const lineNum = idx + 1;

      const nsMatch = line.match(/^\s*namespace\s+([\w\.]+)/);
      if (nsMatch) {
        namespace = nsMatch[1];
        continue;
      }

      const classMatch = line.match(/^\s*(public|private|internal|protected)?\s*(sealed|abstract)?\s*class\s+(\w+)\s*(?:\:\s*([\w\.\s,]+))?/);
      if (classMatch) {
        const className = classMatch[3];
        const fqName = `${namespace}.${className}`;
        currentClassId = fqName;

        symbols.push({
          id: fqName,
          language: 'C#',
          namespace,
          name: className,
          kind: 'class',
          filePath,
          range: { startLine: lineNum, startCol: 0, endLine: lineNum, endCol: line.length },
          modifiers: classMatch[1] ? [classMatch[1]] : [],
          hash
        });

        if (classMatch[4]) {
          const parents = classMatch[4].split(',').map(p => p.trim());
          for (const parent of parents) {
            const isInterface = parent.startsWith('I') && parent.length > 1 && parent[1] === parent[1].toUpperCase();
            relations.push({
              fromId: fqName,
              toId: parent.includes('.') ? parent : `${namespace}.${parent}`,
              type: isInterface ? 'implements' : 'inherits'
            });
          }
        }
        continue;
      }

      const interfaceMatch = line.match(/^\s*(public|private|internal|protected)?\s*interface\s+(\w+)/);
      if (interfaceMatch) {
        const interfaceName = interfaceMatch[2];
        const fqName = `${namespace}.${interfaceName}`;
        currentClassId = fqName;

        symbols.push({
          id: fqName,
          language: 'C#',
          namespace,
          name: interfaceName,
          kind: 'interface',
          filePath,
          range: { startLine: lineNum, startCol: 0, endLine: lineNum, endCol: line.length },
          modifiers: interfaceMatch[1] ? [interfaceMatch[1]] : [],
          hash
        });
        continue;
      }

      const methodMatch = line.match(/^\s*(public|private|protected|internal)?\s*(async|static|override|virtual|abstract)?\s*([\w\<\>]+)\s+(\w+)\s*\(([^\)]*)\)/);
      if (methodMatch && currentClassId) {
        const methodName = methodMatch[4];
        if (methodName !== 'if' && methodName !== 'for' && methodName !== 'while' && methodName !== 'switch' && methodName !== 'catch') {
          const fqMethodName = `${currentClassId}.${methodName}`;
          symbols.push({
            id: fqMethodName,
            language: 'C#',
            namespace,
            name: methodName,
            kind: 'method',
            filePath,
            range: { startLine: lineNum, startCol: 0, endLine: lineNum, endCol: line.length },
            modifiers: methodMatch[1] ? [methodMatch[1]] : [],
            parentId: currentClassId,
            hash
          });

          relations.push({
            fromId: currentClassId,
            toId: fqMethodName,
            type: 'contains'
          });
        }
      }

      const callMatch = line.match(/(\w+)\.(\w+)\(/g);
      if (callMatch && currentClassId) {
        for (const match of callMatch) {
          const parts = match.split('(')[0].split('.');
          const obj = parts[0];
          const method = parts[1];
          if (obj !== 'Console' && obj !== 'Assert' && obj !== 'Math') {
            const activeMethod = symbols.filter(s => s.kind === 'method' && s.filePath === filePath).pop();
            if (activeMethod) {
              relations.push({
                fromId: activeMethod.id,
                toId: method,
                type: 'calls'
              });
            }
          }
        }
      }
    }

    return { symbols, relations };
  }

  private parseJavaScript(filePath: string, content: string, hash: string) {
    const symbols: SymbolNode[] = [];
    const relations: SymbolRelation[] = [];
    const lines = content.split('\n');

    let namespace = 'Global';
    let currentClassId: string | undefined = undefined;

    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx];
      const lineNum = idx + 1;

      const classMatch = line.match(/^\s*(export)?\s*class\s+(\w+)(?:\s+extends\s+(\w+))?/);
      if (classMatch) {
        const className = classMatch[2];
        const fqName = className;
        currentClassId = fqName;

        symbols.push({
          id: fqName,
          language: 'TypeScript',
          namespace,
          name: className,
          kind: 'class',
          filePath,
          range: { startLine: lineNum, startCol: 0, endLine: lineNum, endCol: line.length },
          modifiers: classMatch[1] ? [classMatch[1]] : [],
          hash
        });

        if (classMatch[3]) {
          relations.push({
            fromId: fqName,
            toId: classMatch[3],
            type: 'inherits'
          });
        }
        continue;
      }

      const methodMatch = line.match(/^\s*(public|private|protected|static|export)?\s*(async)?\s*(\w+)\s*\(([^\)]*)\)\s*(?:\:\s*[\w]+)?\s*\{/);
      if (methodMatch) {
        const methodName = methodMatch[3];
        if (methodName !== 'if' && methodName !== 'for' && methodName !== 'while' && methodName !== 'switch' && methodName !== 'catch' && methodName !== 'constructor') {
          const parentId = currentClassId;
          const fqMethodName = parentId ? `${parentId}.${methodName}` : methodName;

          symbols.push({
            id: fqMethodName,
            language: 'TypeScript',
            namespace,
            name: methodName,
            kind: 'method',
            filePath,
            range: { startLine: lineNum, startCol: 0, endLine: lineNum, endCol: line.length },
            modifiers: methodMatch[1] ? [methodMatch[1]] : [],
            parentId,
            hash
          });

          if (parentId) {
            relations.push({
              fromId: parentId,
              toId: fqMethodName,
              type: 'contains'
            });
          }
        }
      }

      const callMatch = line.match(/(\w+)\.(\w+)\(/g);
      if (callMatch) {
        for (const match of callMatch) {
          const parts = match.split('(')[0].split('.');
          const obj = parts[0];
          const method = parts[1];
          if (obj !== 'console' && obj !== 'expect' && obj !== 'Math') {
            const activeMethod = symbols.filter(s => s.kind === 'method' && s.filePath === filePath).pop();
            if (activeMethod) {
              relations.push({
                fromId: activeMethod.id,
                toId: method,
                type: 'calls'
              });
            }
          }
        }
      }
    }

    return { symbols, relations };
  }
}
