import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { ValidationResult } from '../../shared/types/platform';
import { repoError, mftError } from '../../shared/errors/factories';
import { isWithinBoundary } from '../../shared/utils/path';
import { ManifestLoader } from '../manifest/ManifestLoader';
import { HarnessError } from '../../shared/errors/HarnessError';

export class RepositoryValidator {
  private loader = new ManifestLoader();

  validate(root: string, options: { mode: 'strict' | 'lenient' } = { mode: 'lenient' }): ValidationResult {
    const errors: HarnessError[] = [];
    const warnings: string[] = [];

    const addError = (err: HarnessError) => {
      errors.push(err);
      if (options.mode === 'strict') {
        throw err;
      }
    };

    // V01: AGENTS.md exists at root
    const agentsPath = path.join(root, 'AGENTS.md');
    if (!fs.existsSync(agentsPath)) {
      addError(repoError('REPO_011'));
    } else {
      // V08: AGENTS.md size < 50KB
      const stat = fs.statSync(agentsPath);
      if (stat.size > 50 * 1024) {
        warnings.push('AGENTS.md size exceeds 50KB');
      }
    }

    // V02: .harness/harness.yaml exists
    const manifestPath = path.join(root, '.harness', 'harness.yaml');
    if (!fs.existsSync(manifestPath)) {
      addError(repoError('REPO_002'));
      return { valid: false, errors, warnings };
    }

    // V08: repository-map.md exists
    const repoMapPath = path.join(root, '.harness', 'repository-map.md');
    if (!fs.existsSync(repoMapPath)) {
      addError(repoError('REPO_002', { details: 'repository-map.md not found' }));
    }

    // V09: rules/ directory exists
    const rulesDir = path.join(root, '.harness', 'rules');
    if (!fs.existsSync(rulesDir) || !fs.statSync(rulesDir).isDirectory()) {
      addError(repoError('REPO_002', { details: 'rules/ directory not found' }));
    }

    // V03, V04, V05: Load and validate manifest
    let manifest: any = null;
    try {
      manifest = this.loader.load(root);
    } catch (err: any) {
      if (err instanceof HarnessError) {
        addError(err);
      } else {
        addError(repoError('REPO_003', { details: err.message }));
      }
    }

    // V06, V07, V10: Check assets in .harness/ directory
    if (manifest) {
      const assetDirs = ['rules', 'prompts', 'templates', 'workflows', 'knowledge', 'hooks', 'adr'];
      const assetIds = new Set<string>();
      const extendsMap = new Map<string, string>(); // child id -> parent id

      for (const dirName of assetDirs) {
        const dirPath = path.join(root, '.harness', dirName);
        if (!fs.existsSync(dirPath)) continue;

        this.scanDir(dirPath, root, (filePath, content) => {
          // Check size limit V10 (warning if file exceeds 1MB, but also check path traversal V10)
          const fileStat = fs.statSync(filePath);
          if (fileStat.size > 1024 * 1024) {
            warnings.push(`Asset file ${path.relative(root, filePath)} exceeds size limit (1MB)`);
          }

          // Parse frontmatter
          try {
            const parsed = this.parseFrontmatter(content, filePath);
            if (parsed) {
              const { id, extends: ext } = parsed;
              
              // V06: Duplicate asset IDs
              if (assetIds.has(id)) {
                addError(repoError('REPO_006', { details: `Duplicate asset ID: ${id}` }));
              }
              assetIds.add(id);

              if (ext) {
                extendsMap.set(id, ext);
              }
            }
          } catch (e: any) {
            addError(repoError('REPO_007', { details: `Asset metadata invalid in ${path.relative(root, filePath)}: ${e.message}` }));
          }
        });
      }

      // V07: Circular references in asset extends
      for (const [childId, parentId] of extendsMap.entries()) {
        let current: string | undefined = parentId;
        const visited = new Set<string>([childId]);
        while (current) {
          if (visited.has(current)) {
            addError(repoError('REPO_012', { details: `Circular reference detected: ${Array.from(visited).join(' -> ')} -> ${current}` }));
            break;
          }
          visited.add(current);
          current = extendsMap.get(current);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  private scanDir(dir: string, root: string, callback: (filePath: string, content: string) => void) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const relative = path.relative(root, fullPath);

      // V10: Path traversal detection
      if (!isWithinBoundary(root, relative)) {
        throw repoError('REPO_014', { details: `Path traversal detected: ${relative}` });
      }

      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        this.scanDir(fullPath, root, callback);
      } else if (stat.isFile() && (file.endsWith('.md') || file.endsWith('.yaml') || file.endsWith('.yml'))) {
        const content = fs.readFileSync(fullPath, 'utf8');
        callback(fullPath, content);
      }
    }
  }

  private parseFrontmatter(content: string, filePath: string): { id: string; extends?: string } | null {
    if (filePath.endsWith('.md')) {
      const match = content.match(/^---\r?\n([\s\S]+?)\r?\n---/);
      if (!match) {
        throw new Error('Missing frontmatter');
      }
      const fm = yaml.load(match[1]) as any;
      if (!fm || !fm.id) {
        throw new Error('Missing ID in frontmatter');
      }
      return { id: fm.id, extends: fm.extends };
    } else {
      const parsed = yaml.load(content) as any;
      if (!parsed || !parsed.id) {
        throw new Error('Missing ID in workflow/hook file');
      }
      return { id: parsed.id, extends: parsed.extends };
    }
  }
}
