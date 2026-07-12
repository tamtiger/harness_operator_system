import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { RepositoryServiceImpl } from '../src/repository/service';
import { GovernanceServiceImpl } from '../src/governance/service';
import { ProposalStatus, ProposalType } from '../src/shared/types/enums';

describe('M8 Governance Workflow', () => {
  let tempDir: string;
  let repo: RepositoryServiceImpl;
  let gov: GovernanceServiceImpl;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-gov-test-'));
    fs.mkdirSync(path.join(tempDir, '.harness'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, '.harness', 'harness.yaml'), 'version: 2', 'utf8');
    
    repo = new RepositoryServiceImpl();
    const root = repo.discover(tempDir);
    gov = new GovernanceServiceImpl(repo, root);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('create() should generate valid ProposalId', () => {
    const prop = gov.submitProposal({
      title: 'Add rule',
      description: 'Desc',
      type: ProposalType.NEW_ASSET,
      rationale: 'Reason',
      evidence: [{
        id: 'ev-1',
        type: 'human_observation',
        source: 'cli',
        content: 'Looks good',
        timestamp: new Date().toISOString()
      }],
      proposedContent: 'type: rule\nid: rule-1'
    });

    expect(prop.id).toMatch(/^PROP-\d{4}-\d{2}-\d{2}-\d{3}$/);
    expect(prop.status).toBe(ProposalStatus.SUBMITTED);
  });

  it('submit() should throw GOV_004 if evidence is empty', () => {
    // We bypass direct submitProposal to create draft and then submit manually
    repo.discover(tempDir);
    // Directly use ProposalsManager for draft creation
    const proposalsManager = (gov as any).proposals;
    const prop = proposalsManager.create({
      title: 'No evidence',
      description: 'Desc',
      type: ProposalType.NEW_ASSET,
      rationale: 'Reason',
      evidence: [],
      proposedContent: 'type: rule\nid: rule-1'
    });

    expect(prop.status).toBe(ProposalStatus.DRAFT);
    expect(() => gov.submitProposal({
      title: 'No evidence',
      description: 'Desc',
      type: ProposalType.NEW_ASSET,
      rationale: 'Reason',
      evidence: [],
      proposedContent: 'type: rule\nid: rule-1'
    })).toThrow();
  });

  it('review and lock management', () => {
    const prop = gov.submitProposal({
      title: 'Add rule',
      description: 'Desc',
      type: ProposalType.NEW_ASSET,
      rationale: 'Reason',
      evidence: [{ id: '1', type: 'human_observation', source: 'cli', content: 'good', timestamp: new Date().toISOString() }],
      proposedContent: 'type: rule\nid: rule-1'
    });

    // Start review
    const reviewed = gov.review(prop.id, 'reviewer-A');
    expect(reviewed.status).toBe(ProposalStatus.REVIEWING);
    expect((reviewed as any).lockedBy).toBe('reviewer-A');

    // Trying to lock by reviewer-B should throw GOV_003
    expect(() => gov.review(prop.id, 'reviewer-B')).toThrow();

    // Expired lock takeover (> 30 min)
    const thirtyOneMinutesAgo = new Date(Date.now() - 31 * 60 * 1000).toISOString();
    (reviewed as any).lockedAt = thirtyOneMinutesAgo;
    
    // Write expired state back to file
    (gov as any).proposals.persist(reviewed);

    // Reviewer-B can now take over
    const takenOver = gov.review(prop.id, 'reviewer-B');
    expect((takenOver as any).lockedBy).toBe('reviewer-B');
  });

  it('approve and reject operations', () => {
    const prop = gov.submitProposal({
      title: 'Add rule',
      description: 'Desc',
      type: ProposalType.NEW_ASSET,
      rationale: 'Reason',
      evidence: [{ id: '1', type: 'human_observation', source: 'cli', content: 'good', timestamp: new Date().toISOString() }],
      proposedContent: 'type: rule\nid: rule-1'
    });

    // Rejecting from wrong status
    expect(() => gov.approve(prop.id, 'reviewer-A', 'ok')).toThrow();

    gov.review(prop.id, 'reviewer-A');

    // Approving with wrong reviewer should throw GOV_007
    expect(() => gov.approve(prop.id, 'reviewer-B', 'ok')).toThrow();

    // Valid approval
    const approved = gov.approve(prop.id, 'reviewer-A', 'excellent change');
    expect(approved.status).toBe(ProposalStatus.APPROVED);
    expect(approved.comments[0].content).toBe('excellent change');
  });

  it('promote approved proposals to local assets', () => {
    const prop = gov.submitProposal({
      title: 'Add rule',
      description: 'Desc',
      type: ProposalType.NEW_ASSET,
      rationale: 'Reason',
      evidence: [{ id: '1', type: 'human_observation', source: 'cli', content: 'good', timestamp: new Date().toISOString() }],
      proposedContent: 'type: rule\nid: rule-strict'
    });

    expect(() => gov.promote(prop.id)).toThrow();

    gov.review(prop.id, 'reviewer-A');
    gov.approve(prop.id, 'reviewer-A', 'approved');

    const result = gov.promote(prop.id);
    expect(result.promotedAssetPath).toBe('.harness/rules/rule-strict.yaml');

    // Verify file actually created
    const fileExists = fs.existsSync(path.join(tempDir, '.harness', 'rules', 'rule-strict.yaml'));
    expect(fileExists).toBe(true);

    const promoted = gov.getProposal(prop.id);
    expect(promoted.status).toBe(ProposalStatus.PROMOTED);

    // Audit logs
    const auditLogs = gov.getAuditLog(prop.id);
    expect(auditLogs.length).toBeGreaterThanOrEqual(4); // submit, review, approve, promote
  });
});
