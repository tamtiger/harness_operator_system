export type KnowledgeType =
  | 'ARCHITECTURE'
  | 'ADR'
  | 'CONVENTION'
  | 'GLOSSARY'
  | 'FAILURE'
  | 'REPO_MAP'
  | 'CONCEPT_MAP'

export interface KnowledgeEntry {
  id: string
  source_file: string
  type: KnowledgeType
  title: string
  content: string
  tags: string[]
  content_hash: string
  indexed_at: string
}

export interface RepoMapModule {
  name: string
  path: string
  responsibility: string
  depends_on?: string[]
  entry_points?: string[]
}

export interface RepoMap {
  namespace: string
  language: string
  framework: string
  solution?: string
  modules: RepoMapModule[]
  test_projects?: Array<{ name: string; path: string; tests: string[] }>
  migrations?: { path: string; tool: string }
}

export interface ConceptMapEntry {
  name: string
  description: string
  depends_on?: string[]
  source: Record<string, string | string[]>
}

export interface ConceptMap {
  concepts: ConceptMapEntry[]
}

export interface GlossaryTerm {
  term: string
  definition: string
  distinguishes_from?: Array<{ term: string; explanation: string }>
}
