import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, extname, basename } from 'node:path'
import type { KnowledgeEntry, KnowledgeType } from '../../types/knowledge.js'
import { generateId, now, contentHash } from '../../utils/id.js'

/**
 * Recursively scan a directory for indexable files (.md, .yaml, .yml).
 */
export function scanDocsDir(docsPath: string): string[] {
  if (!existsSync(docsPath)) return []

  const results: string[] = []
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry)
      const stat = statSync(full)
      if (stat.isDirectory()) {
        walk(full)
      } else {
        const ext = extname(entry).toLowerCase()
        if (['.md', '.yaml', '.yml'].includes(ext)) {
          results.push(full)
        }
      }
    }
  }
  walk(docsPath)
  return results
}

/**
 * Classify a file into KnowledgeType based on path and content.
 */
export function classifyFile(filePath: string, repoRoot: string): KnowledgeType {
  const rel = relative(repoRoot, filePath).replace(/\\/g, '/')

  if (rel.includes('adr/')) return 'ADR'
  if (rel.includes('architecture/')) return 'ARCHITECTURE'
  if (rel.includes('conventions/')) return 'CONVENTION'
  if (basename(rel) === 'glossary.md') return 'GLOSSARY'
  if (basename(rel) === 'repo-map.yaml' || basename(rel) === 'repo-map.yml') return 'REPO_MAP'
  if (basename(rel) === 'concept-map.yaml' || basename(rel) === 'concept-map.yml') return 'CONCEPT_MAP'

  // Default: architecture (docs/ catch-all)
  return 'ARCHITECTURE'
}

/**
 * Extract title from markdown content (first # heading or filename).
 */
export function extractTitle(content: string, filePath: string): string {
  const match = content.match(/^#\s+(.+)$/m)
  if (match) return match[1].trim()
  return basename(filePath, extname(filePath))
}

/**
 * Extract tags from frontmatter or content.
 */
export function extractTags(content: string, frontmatter: Record<string, unknown>): string[] {
  if (Array.isArray(frontmatter['tags'])) {
    return frontmatter['tags'].map(String)
  }
  // fallback: no tags
  return []
}

/**
 * Parse a single file into a KnowledgeEntry.
 */
export function parseFile(filePath: string, repoRoot: string): KnowledgeEntry {
  const raw = readFileSync(filePath, 'utf-8')

  // Parse frontmatter if present
  let content = raw
  let frontmatter: Record<string, unknown> = {}

  const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/)
  if (fmMatch) {
    // Simple key:value parse (avoid heavy yaml dep for frontmatter)
    const fmBlock = fmMatch[1]
    for (const line of fmBlock.split('\n')) {
      const kv = line.match(/^(\w+)\s*:\s*(.+)$/)
      if (kv) frontmatter[kv[1]] = kv[2].trim()
    }
    content = fmMatch[2]
  }

  const rel = relative(repoRoot, filePath).replace(/\\/g, '/')

  return {
    id: generateId(),
    source_file: rel,
    type: classifyFile(filePath, repoRoot),
    title: extractTitle(content, filePath),
    content,
    tags: extractTags(content, frontmatter),
    content_hash: contentHash(raw),
    indexed_at: now(),
  }
}
