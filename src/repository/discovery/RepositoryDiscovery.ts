import * as fs from 'fs';
import * as path from 'path';
import { repoError } from '../../shared/errors/factories';

export class RepositoryDiscovery {
  discover(workingDir: string): { path: string; hasGit: boolean; discoveredAt: string } {
    let currentDir = path.resolve(workingDir);
    let level = 0;
    const maxLevels = 50;
    let foundGit = false;

    while (level < maxLevels) {
      const manifestPath = path.join(currentDir, '.harness', 'harness.yaml');
      const gitPath = path.join(currentDir, '.git');

      if (fs.existsSync(gitPath)) {
        foundGit = true;
      }

      if (fs.existsSync(manifestPath)) {
        return {
          path: currentDir,
          hasGit: foundGit || fs.existsSync(path.join(currentDir, '.git')),
          discoveredAt: new Date().toISOString()
        };
      }

      const parentDir = path.dirname(currentDir);
      if (currentDir === parentDir) {
        break; // filesystem root
      }
      currentDir = parentDir;
      level++;
    }

    // Secondary signal warning log if we saw a git folder but no harness config
    if (foundGit) {
      console.warn(`[WARNING] Found .git but no .harness/harness.yaml at ${currentDir}`);
    }

    throw repoError('REPO_001');
  }
}
