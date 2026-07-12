import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { RepositoryDiscovery } from '../src/repository/discovery/RepositoryDiscovery';
import { ManifestLoader } from '../src/repository/manifest/ManifestLoader';
import { ManifestValidator } from '../src/repository/manifest/ManifestValidator';
import { RepositoryValidator } from '../src/repository/validation/RepositoryValidator';

describe('M1 Repository Discovery & Validation', () => {
  let tempDir: string;
  let repoDir: string;
  let subDir: string;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-test-'));
    repoDir = path.join(tempDir, 'project-root');
    subDir = path.join(repoDir, 'src', 'components');

    fs.mkdirSync(subDir, { recursive: true });
    fs.mkdirSync(path.join(repoDir, '.harness', 'rules'), { recursive: true });
    
    // Write valid harness.yaml
    const manifestContent = `version: 2
specification: "4.0"
repository:
  root: "."
agent:
  entry_point: "AGENTS.md"
artifacts:
  - type: repository-map
    path: ".harness/repository-map.md"
  - type: rule
    path: ".harness/rules/"
`;
    fs.writeFileSync(path.join(repoDir, '.harness', 'harness.yaml'), manifestContent, 'utf8');
    fs.writeFileSync(path.join(repoDir, '.harness', 'repository-map.md'), '# Map', 'utf8');
    fs.writeFileSync(path.join(repoDir, 'AGENTS.md'), '# AGENTS', 'utf8');
  });

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('RepositoryDiscovery', () => {
    const discovery = new RepositoryDiscovery();

    it('should find repository root traversing up', () => {
      const root = discovery.discover(subDir);
      expect(root.path).toBe(repoDir);
    });

    it('should throw REPO_001 if manifest not found', () => {
      expect(() => discovery.discover(tempDir)).toThrowError();
      try {
        discovery.discover(tempDir);
      } catch (err: any) {
        expect(err.code).toBe('REPO_001');
      }
    });
  });

  describe('ManifestLoader & Validator', () => {
    const loader = new ManifestLoader();
    const validator = new ManifestValidator();

    it('should load valid manifest successfully', () => {
      const manifest = loader.load(repoDir);
      expect(manifest.version).toBe(2);
      expect(manifest.specification).toBe('4.0');
    });

    it('should throw MFT_001 if harness.yaml is missing', () => {
      const badDir = path.join(tempDir, 'bad-dir');
      fs.mkdirSync(path.join(badDir, '.harness'), { recursive: true });
      expect(() => loader.load(badDir)).toThrowError();
      try {
        loader.load(badDir);
      } catch (err: any) {
        expect(err.code).toBe('MFT_001');
      }
    });

    it('should throw MFT_002 if harness.yaml has invalid YAML', () => {
      const badDir = path.join(tempDir, 'bad-yaml-dir');
      fs.mkdirSync(path.join(badDir, '.harness'), { recursive: true });
      fs.writeFileSync(path.join(badDir, '.harness', 'harness.yaml'), 'version: {:', 'utf8');
      expect(() => loader.load(badDir)).toThrowError();
      try {
        loader.load(badDir);
      } catch (err: any) {
        expect(err.code).toBe('MFT_002');
      }
    });

    it('should throw MFT_004 on unsupported version', () => {
      const raw = {
        version: 1, // should be 2
        specification: '4.0',
        repository: { root: '.' },
        agent: { entry_point: 'AGENTS.md' },
        artifacts: [{ type: 'rule', path: '.harness/rules/' }]
      };
      expect(() => validator.validate(raw, repoDir)).toThrow();
      try {
        validator.validate(raw, repoDir);
      } catch (err: any) {
        expect(err.code).toBe('MFT_004');
      }
    });

    it('should throw MFT_005 on spec mismatch', () => {
      const raw = {
        version: 2,
        specification: '3.0', // should be 4.0
        repository: { root: '.' },
        agent: { entry_point: 'AGENTS.md' },
        artifacts: [{ type: 'rule', path: '.harness/rules/' }]
      };
      expect(() => validator.validate(raw, repoDir)).toThrow();
      try {
        validator.validate(raw, repoDir);
      } catch (err: any) {
        expect(err.code).toBe('MFT_005');
      }
    });

    it('should throw MFT_012 on custom fields outside vendor', () => {
      const raw = {
        version: 2,
        specification: '4.0',
        repository: { root: '.' },
        agent: { entry_point: 'AGENTS.md' },
        artifacts: [{ type: 'rule', path: '.harness/rules/' }],
        custom_field: 'forbidden' // should be inside vendor
      };
      expect(() => validator.validate(raw, repoDir)).toThrow();
      try {
        validator.validate(raw, repoDir);
      } catch (err: any) {
        expect(err.code).toBe('MFT_012');
      }
    });

    it('should throw MFT_016 on invalid capability id format', () => {
      const raw = {
        version: 2,
        specification: '4.0',
        repository: { root: '.' },
        agent: { entry_point: 'AGENTS.md' },
        artifacts: [{ type: 'rule', path: '.harness/rules/' }],
        capabilities: [{ id: 'noDot', source: 'shared' }] // missing namespace dot
      };
      expect(() => validator.validate(raw, repoDir)).toThrow();
      try {
        validator.validate(raw, repoDir);
      } catch (err: any) {
        expect(err.code).toBe('MFT_016');
      }
    });

    it('should throw MFT_008 on duplicate source ID', () => {
      const raw = {
        version: 2,
        specification: '4.0',
        repository: { root: '.' },
        agent: { entry_point: 'AGENTS.md' },
        artifacts: [{ type: 'rule', path: '.harness/rules/' }],
        sources: [
          { id: 'src-1', type: 'local_path', uri: '.' },
          { id: 'src-1', type: 'local_path', uri: '.' } // duplicate
        ]
      };
      expect(() => validator.validate(raw, repoDir)).toThrow();
      try {
        validator.validate(raw, repoDir);
      } catch (err: any) {
        expect(err.code).toBe('MFT_008');
      }
    });
  });

  describe('RepositoryValidator', () => {
    const validator = new RepositoryValidator();

    it('should pass validation on valid project structure', () => {
      const result = validator.validate(repoDir);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should collect errors in lenient mode if rules directory is missing', () => {
      const badDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-bad-validation-'));
      fs.mkdirSync(path.join(badDir, '.harness'), { recursive: true });
      fs.writeFileSync(path.join(badDir, 'AGENTS.md'), '# AGENTS', 'utf8');
      
      const manifestContent = `version: 2
specification: "4.0"
repository:
  root: "."
agent:
  entry_point: "AGENTS.md"
artifacts:
  - type: rule
    path: ".harness/rules/"
`;
      fs.writeFileSync(path.join(badDir, '.harness', 'harness.yaml'), manifestContent, 'utf8');
      // No repository-map.md, no rules/ directory.

      const result = validator.validate(badDir, { mode: 'lenient' });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'REPO_002')).toBe(true);

      fs.rmSync(badDir, { recursive: true, force: true });
    });

    it('should detect circular asset references', () => {
      const badDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-circular-'));
      fs.mkdirSync(path.join(badDir, '.harness', 'rules'), { recursive: true });
      fs.writeFileSync(path.join(badDir, 'AGENTS.md'), '# AGENTS', 'utf8');

      const manifestContent = `version: 2
specification: "4.0"
repository:
  root: "."
agent:
  entry_point: "AGENTS.md"
artifacts:
  - type: rule
    path: ".harness/rules/"
`;
      fs.writeFileSync(path.join(badDir, '.harness', 'harness.yaml'), manifestContent, 'utf8');
      fs.writeFileSync(path.join(badDir, '.harness', 'repository-map.md'), '# Map', 'utf8');

      // Create circular extends: A -> B -> A
      fs.writeFileSync(path.join(badDir, '.harness', 'rules', 'rule-a.yaml'),
        `id: "rule-a"\ntype: rule\nversion: 1.0.0\nname: Rule A\nscope: local\nextends: rule-b\n`, 'utf8');
      fs.writeFileSync(path.join(badDir, '.harness', 'rules', 'rule-b.yaml'),
        `id: "rule-b"\ntype: rule\nversion: 1.0.0\nname: Rule B\nscope: local\nextends: rule-a\n`, 'utf8');

      const result = validator.validate(badDir, { mode: 'lenient' });
      expect(result.errors.some(e => e.code === 'REPO_012')).toBe(true);

      fs.rmSync(badDir, { recursive: true, force: true });
    });

    it('should warn on file exceeding 1MB size', () => {
      const bigDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-bigfile-'));
      fs.mkdirSync(path.join(bigDir, '.harness', 'rules'), { recursive: true });
      fs.writeFileSync(path.join(bigDir, 'AGENTS.md'), '# AGENTS', 'utf8');

      const manifestContent = `version: 2
specification: "4.0"
repository:
  root: "."
agent:
  entry_point: "AGENTS.md"
artifacts:
  - type: rule
    path: ".harness/rules/"
`;
      fs.writeFileSync(path.join(bigDir, '.harness', 'harness.yaml'), manifestContent, 'utf8');
      fs.writeFileSync(path.join(bigDir, '.harness', 'repository-map.md'), '# Map', 'utf8');

      // Create file >1MB
      const bigContent = 'x'.repeat(1024 * 1024 + 1);
      fs.writeFileSync(path.join(bigDir, '.harness', 'rules', 'big-rule.yaml'),
        `id: "big-rule"\ntype: rule\nversion: 1.0.0\nname: Big Rule\nscope: local\ncontent: "${bigContent}"\n`, 'utf8');

      const result = validator.validate(bigDir, { mode: 'lenient' });
      expect(result.warnings.some(w => w.includes('exceeds size limit'))).toBe(true);

      fs.rmSync(bigDir, { recursive: true, force: true });
    });

    it('should throw in strict mode on first error', () => {
      const strictDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-strict-'));
      fs.mkdirSync(path.join(strictDir, '.harness'), { recursive: true });
      // No AGENTS.md on purpose

      expect(() => validator.validate(strictDir, { mode: 'strict' })).toThrow();

      fs.rmSync(strictDir, { recursive: true, force: true });
    });
  });
});
