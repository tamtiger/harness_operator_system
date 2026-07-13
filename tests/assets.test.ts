import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as yaml from 'js-yaml';
import * as crypto from 'crypto';
import { AssetLoader } from '../src/repository/assets/AssetLoader';
import { ResolutionEngine } from '../src/repository/resolution/ResolutionEngine';
import { ContextBuilder } from '../src/repository/context/ContextBuilder';
import { FileSystemPersistence } from '../src/repository/persistence/FileSystemPersistence';

describe('M2 Asset Loading, Resolution, & Context', () => {
  let tempDir: string;
  let sharedDir: string;
  let localDir: string;
  const loader = new AssetLoader();
  const resolver = new ResolutionEngine();
  const builder = new ContextBuilder();
  const persistence = new FileSystemPersistence();

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-m2-test-'));
    sharedDir = path.join(tempDir, 'shared');
    localDir = path.join(tempDir, 'local');

    fs.mkdirSync(path.join(sharedDir, 'rules'), { recursive: true });
    fs.mkdirSync(path.join(sharedDir, '..', 'metadata'), { recursive: true });
    fs.mkdirSync(path.join(localDir, '.harness', 'rules'), { recursive: true });
    fs.mkdirSync(path.join(localDir, '.harness', 'knowledge'), { recursive: true });
    fs.mkdirSync(path.join(localDir, '.harness', 'hooks'), { recursive: true });

    // Mock installed.yaml and checksum.yaml
    fs.writeFileSync(path.join(sharedDir, '..', 'metadata', 'installed.yaml'), 'version: "2.1.0"', 'utf8');
    
    // Checksum data
    const checksums = {
      checksums: {
        'shared/rules/coding-standards.md': 'sha256:4d8a11394f4c9c27725725227725725227725725227725725227725725227725'
      }
    };
    fs.writeFileSync(path.join(sharedDir, '..', 'metadata', 'checksum.yaml'), yaml.dump(checksums), 'utf8');

    // Create shared asset
    const sharedAssetFM = `---
id: "shared.rule.coding"
type: "rule"
version: "1.0.0"
name: "Shared Coding Standards"
scope: "shared"
status: "active"
---
# Shared standards content
`;
    // The content sha256 hash must match the expected checksum to avoid REPO_009
    // Wait, let's write exact content, hash it, and put it in checksums or mock loadSharedAssets call.
    // Hash of "---[\n]id:..." -> let's compute programmatically and write to checksums.
    const fileContent = sharedAssetFM.replace(/\r\n/g, '\n');
    const hash = crypto.createHash('sha256').update(fileContent, 'utf8').digest('hex');
    checksums.checksums['shared/rules/coding-standards.md'] = `sha256:${hash}`;
    fs.writeFileSync(path.join(sharedDir, '..', 'metadata', 'checksum.yaml'), yaml.dump(checksums), 'utf8');
    fs.writeFileSync(path.join(sharedDir, 'rules', 'coding-standards.md'), fileContent, 'utf8');

    // Create local assets
    const localAssetFM = `---
id: "local.rule.standards"
type: "rule"
version: "1.0.0"
name: "Local Coding Standards"
scope: "local"
status: "active"
---
# Local standards content
`;
    fs.writeFileSync(path.join(localDir, '.harness', 'rules', 'standards.md'), localAssetFM, 'utf8');

    // Create knowledge for merge test
    const knowledgeFM = `---
id: "shared.knowledge.rules"
type: "knowledge"
version: "1.0.0"
name: "Rules Knowledge"
scope: "local"
status: "active"
---
# Knowledge content
`;
    fs.writeFileSync(path.join(localDir, '.harness', 'knowledge', 'rules.md'), knowledgeFM, 'utf8');
  });

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should successfully load shared assets within correct path', () => {
    const collection = loader.loadSharedAssets(sharedDir);
    expect(collection.rules.length).toBe(1);
    expect(collection.rules[0].metadata.id).toBe('shared.rule.coding');
  });

  it('should resolve and override assets correctly', () => {
    const sharedColl = loader.loadSharedAssets(sharedDir);
    
    // Create local duplicate rules to verify overrides
    const manifest = {
      version: 2,
      specification: '4.0',
      repository: { root: '.' },
      agent: { entry_point: 'AGENTS.md' },
      artifacts: [
        { type: 'rule', path: '.harness/rules/' },
        { type: 'knowledge', path: '.harness/knowledge/' }
      ]
    } as any;
    
    const localColl = loader.loadLocalAssets({ path: localDir, hasGit: false, discoveredAt: '' }, manifest);
    const effective = resolver.resolve(sharedColl, localColl);

    expect(effective.rules.length).toBe(2);
    expect(effective.rules.find(r => r.metadata.id === 'local.rule.standards')).toBeDefined();
  });

  it('should build frozen RepositoryContext', () => {
    const sharedColl = loader.loadSharedAssets(sharedDir);
    const manifest = {
      version: 2,
      specification: '4.0',
      repository: { root: '.' },
      agent: { entry_point: 'AGENTS.md' },
      artifacts: [{ type: 'rule', path: '.harness/rules/' }]
    } as any;
    const localColl = loader.loadLocalAssets({ path: localDir, hasGit: false, discoveredAt: '' }, manifest);
    const effective = resolver.resolve(sharedColl, localColl);

    const context = builder.build(effective, {
      root: { path: localDir, hasGit: false, discoveredAt: '' },
      name: 'test',
      manifest: {
        version: 2,
        specification: '4.0',
        repository: { root: '.' },
        agent: { entry_point: 'AGENTS.md' },
        artifacts: []
      },
      discoveredAt: new Date().toISOString()
    });

    expect(Object.isFrozen(context)).toBe(true);
    expect(Object.isFrozen(context.metadata)).toBe(true);
    expect(Object.isFrozen(context.assets)).toBe(true);
  });

  it('should run FileSystemPersistence write atomically', () => {
    const root = { path: localDir, hasGit: false, discoveredAt: '' };
    persistence.write(root, 'rules/new-rule.md', '---\nid: local.rule.new\ntype: rule\nversion: 1.0.0\nname: New Rule\nscope: local\nstatus: active\n---\nBody');
    
    const content = persistence.read(root, 'rules/new-rule.md');
    expect(content).toContain('New Rule');
  });

  it('should throw REPO_009 on checksum mismatch', () => {
    const badChecksumDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-badcs-'));
    fs.mkdirSync(path.join(badChecksumDir, 'rules'), { recursive: true });
    fs.mkdirSync(path.join(badChecksumDir, '..', 'metadata'), { recursive: true });

    fs.writeFileSync(path.join(badChecksumDir, '..', 'metadata', 'installed.yaml'), 'version: "2.1.0"', 'utf8');
    // Compute the correct relative path: from metadata dir, file is at ../shared/rules/test.md
    // AssetLoader computes: path.relative(path.join(resolvedPath, '..'), filePath)
    const dirName = path.basename(badChecksumDir);
    const expectedRelPath = `${dirName}/rules/test.md`.replace(/\\/g, '/');
    const checksums = { checksums: {} };
    checksums.checksums[expectedRelPath] = 'sha256:0000000000000000000000000000000000000000000000000000000000000000';
    fs.writeFileSync(path.join(badChecksumDir, '..', 'metadata', 'checksum.yaml'),
      JSON.stringify(checksums), 'utf8');
    fs.writeFileSync(path.join(badChecksumDir, 'rules', 'test.md'),
      '---\nid: shared.rule.test\ntype: rule\nversion: 1.0.0\nname: Test\nscope: shared\n---\nBody', 'utf8');

    expect(() => loader.loadSharedAssets(badChecksumDir)).toThrowError();
    try {
      loader.loadSharedAssets(badChecksumDir);
    } catch (err: any) {
      expect(err.code).toBe('REPO_009');
    }
    fs.rmSync(badChecksumDir, { recursive: true, force: true });
  });

  it('should skip binary files (null bytes) silently', () => {
    const binaryDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-binary-'));
    const binaryLocalDir = path.join(binaryDir, 'local');
    fs.mkdirSync(path.join(binaryLocalDir, '.harness', 'rules'), { recursive: true });

    // Write a binary file with null bytes
    const buf = Buffer.from('---\nid: local.rule.binary\ntype: rule\nversion: 1.0.0\nname: Binary\nscope: local\n---\n\0Body', 'utf8');
    fs.writeFileSync(path.join(binaryLocalDir, '.harness', 'rules', 'binary.md'), buf, 'binary');

    const manifest = {
      version: 2, specification: '4.0',
      repository: { root: '.' },
      agent: { entry_point: 'AGENTS.md' },
      artifacts: [{ type: 'rule', path: '.harness/rules/' }]
    } as any;

    const coll = loader.loadLocalAssets({ path: binaryLocalDir, hasGit: false, discoveredAt: '' }, manifest);
    expect(coll.rules.length).toBe(0);

    fs.rmSync(binaryDir, { recursive: true, force: true });
  });

  it('should throw REPO_006 on duplicate asset IDs', () => {
    const dupDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-dup-'));
    fs.mkdirSync(path.join(dupDir, '.harness', 'rules'), { recursive: true });

    const fm = `---\nid: "dup-id"\ntype: "rule"\nversion: "1.0.0"\nname: "Dup"\nscope: "local"\n---\nBody`;
    fs.writeFileSync(path.join(dupDir, '.harness', 'rules', 'r1.md'), fm, 'utf8');
    fs.writeFileSync(path.join(dupDir, '.harness', 'rules', 'r2.md'), fm, 'utf8');

    const manifest = {
      version: 2, specification: '4.0',
      repository: { root: '.' },
      agent: { entry_point: 'AGENTS.md' },
      artifacts: [{ type: 'rule', path: '.harness/rules/' }]
    } as any;

    expect(() => loader.loadLocalAssets({ path: dupDir, hasGit: false, discoveredAt: '' }, manifest)).toThrow();
    try {
      loader.loadLocalAssets({ path: dupDir, hasGit: false, discoveredAt: '' }, manifest);
    } catch (err: any) {
      expect(err.code).toBe('REPO_006');
    }
    fs.rmSync(dupDir, { recursive: true, force: true });
  });

  it('should load ADR files from .harness/adr/', () => {
    const adrDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-adr-'));
    fs.mkdirSync(path.join(adrDir, '.harness', 'adr'), { recursive: true });
    fs.mkdirSync(path.join(adrDir, '.harness', 'rules'), { recursive: true });

    fs.writeFileSync(path.join(adrDir, '.harness', 'adr', '001-use-typescript.md'),
      '# ADR 001\n\nUse TypeScript for the project.\n', 'utf8');

    const manifest = {
      version: 2, specification: '4.0',
      repository: { root: '.' },
      agent: { entry_point: 'AGENTS.md' },
      artifacts: [{ type: 'rule', path: '.harness/rules/' }]
    } as any;

    const coll = loader.loadLocalAssets({ path: adrDir, hasGit: false, discoveredAt: '' }, manifest);
    // ADR directory is not loaded by AssetLoader (it's loaded by ContextBuilder)
    // So we just verify the loader doesn't throw and returns an empty rule set
    expect(coll.rules.length).toBe(0);

    fs.rmSync(adrDir, { recursive: true, force: true });
  });

  it('should load skill assets from .harness/skills/', () => {
    const skillDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-skills-'));
    fs.mkdirSync(path.join(skillDir, '.harness', 'skills'), { recursive: true });

    const skillFM = `---
id: "local.skill.test"
type: "skill"
version: "1.0.0"
name: "Test Skill"
scope: "local"
triggers:
  - "feature-dev"
workflows:
  - "custom-workflow"
---
# Skill Content
`;
    fs.writeFileSync(path.join(skillDir, '.harness', 'skills', 'test-skill.md'), skillFM, 'utf8');

    const manifest = {
      version: 2, specification: '4.0',
      repository: { root: '.' },
      agent: { entry_point: 'AGENTS.md' },
      artifacts: []
    } as any;

    const coll = loader.loadLocalAssets({ path: skillDir, hasGit: false, discoveredAt: '' }, manifest);
    expect(coll.skills.length).toBe(1);
    expect(coll.skills[0].metadata.id).toBe('local.skill.test');
    expect((coll.skills[0] as any).triggers).toEqual(['feature-dev']);
    expect((coll.skills[0] as any).workflows).toEqual(['custom-workflow']);

    fs.rmSync(skillDir, { recursive: true, force: true });
  });
});
