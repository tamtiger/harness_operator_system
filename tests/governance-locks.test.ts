import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { GovernanceServiceImpl } from '../src/governance/service';
import { RepositoryServiceImpl } from '../src/repository/service';
import { FileSystemPersistence } from '../src/repository/persistence/FileSystemPersistence';
import { ProposalStatus } from '../src/shared/types/enums';

describe('M9 Governance - Review Locks & Expiration', () => {
  let tempDir: string;
  let repo: RepositoryServiceImpl;
  let gov: GovernanceServiceImpl;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-gov-locks-test-'));
    repo = new RepositoryServiceImpl(new FileSystemPersistence());
    
    // Initialize repository skeleton
    const harnessDir = path.join(tempDir, '.harness');
    fs.mkdirSync(harnessDir, { recursive: true });
    fs.writeFileSync(path.join(harnessDir, 'harness.yaml'), `version: 2
specification: "4.0"
repository:
  root: "."
agent:
  entry_point: "AGENTS.md"
artifacts: []
`, 'utf8');

    gov = new GovernanceServiceImpl(repo, { path: tempDir, hasGit: false, discoveredAt: '' });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should deny direct approval of a submitted proposal without previous lock', () => {
    const prop = gov.submitProposal({
      title: 'Prop 1',
      description: 'Desc',
      type: 'rule' as any,
      rationale: 'Rationale',
      evidence: ['log-1']
    });

    expect(prop.status).toBe(ProposalStatus.SUBMITTED);

    expect(() => {
      gov.approve(prop.id, 'reviewer-1', 'Looks good');
    }).toThrow();
  });

  it('should deny approval of locked proposal within 30 minutes by another reviewer', () => {
    const prop = gov.submitProposal({
      title: 'Prop 2',
      description: 'Desc',
      type: 'rule' as any,
      rationale: 'Rationale',
      evidence: ['log-1']
    });

    // reviewer-1 locks the review
    gov.review(prop.id, 'reviewer-1');

    // reviewer-2 tries to approve and gets denied (GOV_007)
    expect(() => {
      gov.approve(prop.id, 'reviewer-2', 'Direct override');
    }).toThrow();
  });

  it('should allow override approval of locked proposal after 30 minutes (lock expired)', () => {
    const prop = gov.submitProposal({
      title: 'Prop 3',
      description: 'Desc',
      type: 'rule' as any,
      rationale: 'Rationale',
      evidence: ['log-1']
    });

    // reviewer-1 locks
    gov.review(prop.id, 'reviewer-1');

    // Manually backdate lock timestamp in file to simulate expired lock (e.g. 40 minutes ago)
    const fileRelPath = `.harness/proposals/${prop.id}.md`;
    const content = fs.readFileSync(path.join(tempDir, fileRelPath), 'utf8');
    const expiredTime = new Date(Date.now() - 40 * 60 * 1000).toISOString();
    const updatedContent = content.replace(/lockedAt: .*/, `lockedAt: ${expiredTime}`);
    fs.writeFileSync(path.join(tempDir, fileRelPath), updatedContent, 'utf8');

    // Invalidate proposal manager cache so it reads from backdated file
    (gov as any).proposals.invalidateCache(prop.id);

    // reviewer-2 approves and succeeds due to expired lock
    const approved = gov.approve(prop.id, 'reviewer-2', 'Override expired lock');
    expect(approved.status).toBe(ProposalStatus.APPROVED);
    expect(approved.lockedBy).toBe('');
  });
});
