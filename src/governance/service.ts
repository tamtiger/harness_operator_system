import { GovernanceService, RepositoryService } from '../shared/contracts/services';
import { Proposal, AuditRecord } from '../shared/types/governance';
import { ProposalRequest, ProposalFilter, PromotionResult } from '../shared/types/platform';
import { ProposalStatus } from '../shared/types/enums';
import { ProposalId, RepositoryRoot } from '../shared/types/primitives';
import { ProposalManager } from './proposal/ProposalManager';
import { ReviewManager } from './review/ReviewManager';
import { ApprovalEngine } from './approval/ApprovalEngine';
import { PromotionEngine } from './promotion/PromotionEngine';
import { AuditLogger } from './audit/AuditLogger';

export class GovernanceServiceImpl implements GovernanceService {
  private proposals: ProposalManager;
  private reviewMgr: ReviewManager;
  private approval: ApprovalEngine;
  private promotion: PromotionEngine;
  private audit: AuditLogger;

  constructor(
    repo: RepositoryService,
    root: RepositoryRoot
  ) {
    this.audit = new AuditLogger(repo, root);
    this.proposals = new ProposalManager(repo, root, this.audit);
    this.reviewMgr = new ReviewManager(this.proposals, this.audit);
    this.approval = new ApprovalEngine(this.proposals, this.audit);
    this.promotion = new PromotionEngine(this.proposals, repo, root, this.audit);
  }

  submitProposal(request: ProposalRequest): Proposal {
    const prop = this.proposals.create(request);
    return this.proposals.submit(prop.id);
  }

  listProposals(filter: ProposalFilter): Proposal[] {
    return this.proposals.list(filter);
  }

  getProposal(id: ProposalId): Proposal {
    return this.proposals.get(id);
  }

  review(id: ProposalId, reviewer: string): Proposal {
    return this.reviewMgr.startReview(id, reviewer);
  }

  approve(id: ProposalId, reviewer: string, comments: string): Proposal {
    return this.approval.approve(id, reviewer, comments);
  }

  reject(id: ProposalId, reviewer: string, comments: string): Proposal {
    return this.approval.reject(id, reviewer, comments);
  }

  requestChanges(id: ProposalId, reviewer: string, comments: string): Proposal {
    return this.reviewMgr.requestChanges(id, reviewer, comments);
  }

  promote(id: ProposalId): PromotionResult {
    return this.promotion.promote(id);
  }

  getAuditLog(proposalId: ProposalId): AuditRecord[] {
    return this.audit.getLog(proposalId);
  }
}
