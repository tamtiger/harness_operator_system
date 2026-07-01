import { join, relative } from 'node:path'
import { readFileSync, existsSync } from 'node:fs'
import { load as loadYaml } from 'js-yaml'
import type { IKnowledgeEngine } from '../types/engines.js'
import type { KnowledgeEntry, KnowledgeType, RepoMap, ConceptMap, GlossaryTerm } from '../types/knowledge.js'
import { BM25Index } from './knowledge/bm25-index.js'
import { scanDocsDir, parseFile } from './knowledge/parser.js'

export class KnowledgeEngine implements IKnowledgeEngine {
  private bm25: BM25Index
  private repoPath: string

  constructor(repoPath: string, dbPath: string) {
    this.repoPath = repoPath
    this.bm25 = new BM25Index(dbPath)
  }

  /**
   * Index all knowledge from docs/ in the repository.
   * Skips files with unchanged content_hash.
   */
  async index(repoPath?: string): Promise<void> {
    const root = repoPath ?? this.repoPath
    const docsPath = join(root, 'docs')
    const files = scanDocsDir(docsPath)

    // Also index README.md if present
    const readmePath = join(root, 'README.md')
    if (existsSync(readmePath)) files.push(readmePath)

    let indexed = 0
    let skipped = 0
    const relFiles: string[] = []

    for (const filePath of files) {
      const rel = relative(root, filePath).replace(/\\/g, '/')
      relFiles.push(rel)

      // Check if unchanged
      const entry = parseFile(filePath, root)
      const existingHash = this.bm25.getHash(rel)
      if (existingHash === entry.content_hash) {
        skipped++
        continue
      }

      this.bm25.upsert(entry)
      indexed++
    }

    // Remove stale entries
    this.bm25.removeStale(relFiles)
  }

  async search(query: string, topK: number = 10): Promise<KnowledgeEntry[]> {
    return this.bm25.search(query, topK)
  }

  async getRepoMap(): Promise<RepoMap | null> {
    const path = join(this.repoPath, 'docs', 'repo-map.yaml')
    if (!existsSync(path)) return null
    const content = readFileSync(path, 'utf-8')
    return loadYaml(content) as RepoMap
  }

  async getConceptMap(): Promise<ConceptMap | null> {
    const path = join(this.repoPath, 'docs', 'concept-map.yaml')
    if (!existsSync(path)) return null
    const content = readFileSync(path, 'utf-8')
    return loadYaml(content) as ConceptMap
  }

  async getGlossary(): Promise<GlossaryTerm[]> {
    const path = join(this.repoPath, 'docs', 'glossary.md')
    if (!existsSync(path)) return []
    const content = readFileSync(path, 'utf-8')
    return parseGlossaryMarkdown(content)
  }

  async getByType(type: KnowledgeType): Promise<KnowledgeEntry[]> {
    return this.bm25.getByType(type)
  }

  async invalidateCache(): Promise<void> {
    // Force re-index by re-running index
    await this.index()
  }

  getEntryCount(): number {
    return this.bm25.count()
  }

  close(): void {
    this.bm25.close()
  }
}

/**
 * Parse glossary.md into structured terms.
 * Expected format: ## Term\nDefinition text
 */
function parseGlossaryMarkdown(content: string): GlossaryTerm[] {
  const terms: GlossaryTerm[] = []
  const sections = content.split(/^##\s+/m).filter(Boolean)

  for (const section of sections) {
    const lines = section.trim().split('\n')
    const term = lines[0].trim()
    if (!term || term.startsWith('#')) continue // skip # headings

    const definition = lines.slice(1).join('\n').trim()
    terms.push({ term, definition })
  }

  return terms
}
