import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface WorktreeInfo {
  branch: string;
  path: string;
}

export class WorktreeManager {
  private worktreePath: string | null = null;

  constructor(private repoRoot: string) {}

  isInWorktree(): boolean {
    try {
      const gitDir = execSync('git rev-parse --git-dir', { cwd: this.repoRoot, encoding: 'utf8' }).trim();
      const gitCommonDir = execSync('git rev-parse --git-common-dir', { cwd: this.repoRoot, encoding: 'utf8' }).trim();
      const mainGitDir = path.join(this.repoRoot, '.git');
      return path.resolve(gitDir) !== path.resolve(mainGitDir)
        || path.resolve(gitCommonDir) !== path.resolve(mainGitDir);
    } catch {
      return false;
    }
  }

  isInSubmodule(): boolean {
    try {
      const superProject = execSync('git rev-parse --show-superproject-working-tree', { cwd: this.repoRoot, encoding: 'utf8' }).trim();
      return superProject.length > 0;
    } catch {
      return false;
    }
  }

  currentBranch(): string {
    try {
      return execSync('git branch --show-current', { cwd: this.repoRoot, encoding: 'utf8' }).trim();
    } catch {
      return '';
    }
  }

  ensureWorktreesDir(): string {
    const worktreesDir = path.join(this.repoRoot, '.worktrees');
    if (!fs.existsSync(worktreesDir)) {
      const gitignore = path.join(this.repoRoot, '.gitignore');
      const gitignoreContent = fs.existsSync(gitignore) ? fs.readFileSync(gitignore, 'utf8') : '';
      if (!gitignoreContent.includes('.worktrees/')) {
        fs.appendFileSync(gitignore, '\n.worktrees/\n', 'utf8');
      }
      fs.mkdirSync(worktreesDir, { recursive: true });
    }
    return worktreesDir;
  }

  createWorktree(branchName: string): WorktreeInfo {
    if (this.isInWorktree()) {
      return { branch: this.currentBranch(), path: this.repoRoot };
    }

    const worktreesDir = this.ensureWorktreesDir();
    const worktreePath = path.join(worktreesDir, branchName);

    if (fs.existsSync(worktreePath)) {
      return { branch: branchName, path: worktreePath };
    }

    execSync(`git worktree add "${worktreePath}" -b "${branchName}" 2>/dev/null || git worktree add "${worktreePath}" "${branchName}"`, {
      cwd: this.repoRoot,
      encoding: 'utf8',
      stdio: 'pipe'
    });

    this.worktreePath = worktreePath;

    execSync('npm install 2>/dev/null || true', { cwd: worktreePath, encoding: 'utf8', stdio: 'pipe' });

    return { branch: branchName, path: worktreePath };
  }

  removeWorktree(branch: string): void {
    const worktreesDir = path.join(this.repoRoot, '.worktrees');
    const worktreePath = path.join(worktreesDir, branch);

    if (fs.existsSync(worktreePath)) {
      try {
        execSync(`git worktree remove "${worktreePath}" 2>/dev/null`, { cwd: this.repoRoot, encoding: 'utf8', stdio: 'pipe' });
      } catch {
        try {
          execSync(`git worktree remove --force "${worktreePath}" 2>/dev/null`, { cwd: this.repoRoot, encoding: 'utf8', stdio: 'pipe' });
        } catch {
          // Best-effort cleanup
        }
      }
    }

    if (fs.existsSync(worktreePath)) {
      try {
        fs.rmSync(worktreePath, { recursive: true, force: true });
      } catch {
        // Best-effort
      }
    }

    try {
      execSync(`git branch -D "${branch}" 2>/dev/null`, { cwd: this.repoRoot, encoding: 'utf8', stdio: 'pipe' });
    } catch {
      // Branch may not exist
    }

    this.worktreePath = null;
  }

  getActiveWorktree(): WorktreeInfo | null {
    if (!this.isInWorktree()) return null;
    return {
      branch: this.currentBranch(),
      path: this.repoRoot
    };
  }

  getRepoRoot(): string {
    try {
      return execSync('git rev-parse --show-toplevel', { cwd: this.repoRoot, encoding: 'utf8' }).trim();
    } catch {
      return this.repoRoot;
    }
  }
}
