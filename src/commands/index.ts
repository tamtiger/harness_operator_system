import { join } from 'node:path'
import { existsSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { KnowledgeEngine } from '../engines/knowledge-engine.js'

export interface IndexResult {
  entries: number
  dbPath: string
}

/**
 * Resolve the harness workspace path for a given namespace.
 */
export function getWorkspacePath(namespace: string): string {
  return join(homedir(), '.harness', 'repositories', namespace)
}

/**
 * Index the knowledge base for a repository.
 */
export async function indexKnowledge(repoPath: string, namespace: string): Promise<IndexResult> {
  const workspacePath = getWorkspacePath(namespace)
  const cachePath = join(workspacePath, 'cache')
  if (!existsSync(cachePath)) mkdirSync(cachePath, { recursive: true })

  const dbPath = join(cachePath, 'knowledge.db')
  const engine = new KnowledgeEngine(repoPath, dbPath)

  await engine.index()
  const entries = engine.getEntryCount()
  engine.close()

  return { entries, dbPath }
}
