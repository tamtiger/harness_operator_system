import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { KnowledgeEngine } from '../src/engines/knowledge-engine.js'

const TEST_DIR = join(tmpdir(), 'harness-test-knowledge-' + Date.now())
const REPO_DIR = join(TEST_DIR, 'repo')
const DB_PATH = join(TEST_DIR, 'knowledge.db')

function setupTestRepo() {
  mkdirSync(join(REPO_DIR, 'docs', 'architecture'), { recursive: true })
  mkdirSync(join(REPO_DIR, 'docs', 'conventions'), { recursive: true })
  mkdirSync(join(REPO_DIR, 'docs', 'adr'), { recursive: true })

  writeFileSync(join(REPO_DIR, 'docs', 'architecture', 'overview.md'), `# Architecture Overview

## Layers
- Domain: Business entities
- Application: Use cases
- Infrastructure: External systems
`)

  writeFileSync(join(REPO_DIR, 'docs', 'conventions', 'naming.md'), `# Naming Conventions

- Files: kebab-case
- Classes: PascalCase
- Functions: camelCase
`)

  writeFileSync(join(REPO_DIR, 'docs', 'glossary.md'), `# Glossary

## Payment
A transaction initiated by the customer.

## Refund
A reversal of a previous payment.

## Settlement
Batch reconciliation process between banks.
`)

  writeFileSync(join(REPO_DIR, 'docs', 'repo-map.yaml'), `namespace: test-project
language: typescript
framework: node
modules:
  - name: src
    path: src/
    responsibility: Main source code
`)

  writeFileSync(join(REPO_DIR, 'docs', 'adr', 'adr-001.md'), `---
id: adr-001
title: Use SQLite for local storage
status: accepted
---

# ADR-001: Use SQLite

## Decision
Use SQLite via better-sqlite3 for all local storage needs.

## Rationale
Zero infrastructure, fast, portable.
`)
}

describe('KnowledgeEngine', () => {
  let engine: KnowledgeEngine

  beforeEach(() => {
    setupTestRepo()
    engine = new KnowledgeEngine(REPO_DIR, DB_PATH)
  })

  afterEach(() => {
    engine.close()
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true })
  })

  it('indexes docs/ directory', async () => {
    await engine.index()
    expect(engine.getEntryCount()).toBeGreaterThanOrEqual(4)
  })

  it('skips unchanged files on re-index', async () => {
    await engine.index()
    const count1 = engine.getEntryCount()
    await engine.index()
    const count2 = engine.getEntryCount()
    expect(count2).toBe(count1)
  })

  it('searches with BM25', async () => {
    await engine.index()
    const results = await engine.search('payment transaction')
    expect(results.length).toBeGreaterThan(0)
  })

  it('searches for architecture content', async () => {
    await engine.index()
    const results = await engine.search('layers domain infrastructure')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].type).toBe('ARCHITECTURE')
  })

  it('returns entries by type', async () => {
    await engine.index()
    const adrs = await engine.getByType('ADR')
    expect(adrs.length).toBe(1)
    expect(adrs[0].title).toContain('SQLite')
  })

  it('parses glossary', async () => {
    await engine.index()
    const terms = await engine.getGlossary()
    expect(terms.length).toBe(3)
    expect(terms[0].term).toBe('Payment')
    expect(terms[1].term).toBe('Refund')
    expect(terms[2].term).toBe('Settlement')
  })

  it('parses repo-map.yaml', async () => {
    await engine.index()
    const repoMap = await engine.getRepoMap()
    expect(repoMap).not.toBeNull()
    expect(repoMap!.namespace).toBe('test-project')
    expect(repoMap!.modules.length).toBe(1)
    expect(repoMap!.modules[0].name).toBe('src')
  })

  it('classifies files correctly', async () => {
    await engine.index()
    const arch = await engine.getByType('ARCHITECTURE')
    const conv = await engine.getByType('CONVENTION')
    const adr = await engine.getByType('ADR')
    expect(arch.length).toBeGreaterThanOrEqual(1)
    expect(conv.length).toBe(1)
    expect(adr.length).toBe(1)
  })
})
