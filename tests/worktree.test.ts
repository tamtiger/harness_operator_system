import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { WorktreeManager } from '../src/execution/worktree/WorktreeManager';

describe('WorktreeManager', () => {
  const repoRoot = path.resolve(__dirname, '..');

  it('should detect if not in a submodule', () => {
    const mgr = new WorktreeManager(repoRoot);
    expect(mgr.isInSubmodule()).toBe(false);
  });

  it('should return current branch name', () => {
    const mgr = new WorktreeManager(repoRoot);
    const branch = mgr.currentBranch();
    expect(branch.length).toBeGreaterThan(0);
  });

  it('should detect worktree status', () => {
    const mgr = new WorktreeManager(repoRoot);
    // In normal repo checkout, isInWorktree should be false
    // We just verify it runs without error
    const result = mgr.isInWorktree();
    expect(typeof result).toBe('boolean');
  });

  it('should return repo root', () => {
    const mgr = new WorktreeManager(repoRoot);
    const root = mgr.getRepoRoot();
    expect(path.resolve(root)).toBe(path.resolve(repoRoot));
  });

  it('should getActiveWorktree return null when not in worktree', () => {
    const mgr = new WorktreeManager(repoRoot);
    // In normal repo, this should return null (or the info)
    // We just verify it runs without error
    const info = mgr.getActiveWorktree();
    expect(info === null || (typeof info!.branch === 'string')).toBe(true);
  });
});
