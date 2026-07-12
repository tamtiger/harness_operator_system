import { GovernanceService } from '../shared/contracts/services';
import { Proposal, AuditRecord } from '../shared/types/governance';
import { ProposalRequest, ProposalFilter, PromotionResult } from '../shared/types/platform';
import { ProposalId } from '../shared/types/primitives';
import { ProposalStatus } from '../shared/types/enums';

export class GovernanceServiceImpl implements GovernanceService {
  private proposals = new Map<string, Proposal>();
  private auditLogs = new Map<string, AuditRecord[]>();

  submitProposal(request: ProposalRequest): Proposal {
    const id = 'prop-' + Math.random().toString(36).substring(2, 9);
    const proposal: Proposal = {
      id,
      title: request.title,
      description: request.description,
      type: request.type,
      status: ProposalStatus.SUBMITTED,
      rationale: request.rationale,
      proposedContent: request.proposedContent,
      evidence: request.evidence,
      targetAsset: request.targetAsset,
      author: 'cli',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      reviewers: [],
      comments: [],
      tags: []
    };
    this.proposals.set(id, proposal);
    this.auditLogs.set(id, []);
    return proposal;
  }

  listProposals(filter: ProposalFilter): Proposal[] {
    let list = Array.from(this.proposals.values());
    if (filter.status) {
      list = list.filter(p => p.status === filter.status);
    }
    if (filter.type) {
      list = list.filter(p => p.type === filter.type);
    }
    return list;
  }

  getProposal(id: ProposalId): Proposal {
    const prop = this.proposals.get(id);
    if (!prop) throw new Error(`Proposal not found: ${id}`);
    return prop;
  }

  review(id: ProposalId, reviewer: string): Proposal {
    const prop = this.getProposal(id);
    prop.status = ProposalStatus.REVIEWING;
    prop.updatedAt = new Date().toISOString();
    return prop;
  }

  approve(id: ProposalId, reviewer: string, comments: string): Proposal {
    const prop = this.getProposal(id);
    prop.status = ProposalStatus.APPROVED;
    prop.updatedAt = new Date().toISOString();
    return prop;
  }

  reject(id: ProposalId, reviewer: string, comments: string): Proposal {
    const prop = this.getProposal(id);
    prop.status = ProposalStatus.REJECTED;
    prop.updatedAt = new Date().toISOString();
    return prop;
  }

  requestChanges(id: ProposalId, reviewer: string, comments: string): Proposal {
    const prop = this.getProposal(id);
    prop.status = ProposalStatus.DRAFT;
    prop.updatedAt = new Date().toISOString();
    return prop;
  }

  promote(id: ProposalId): PromotionResult {
    const prop = this.getProposal(id);
    prop.status = ProposalStatus.PROMOTED;
    prop.updatedAt = new Date().toISOString();
    return {
      proposalId: id,
      promotedAssetPath: prop.proposedContent,
      promotedAt: new Date().toISOString()
    };
  }

  getAuditLog(proposalId: ProposalId): AuditRecord[] {
    return this.auditLogs.get(proposalId) || [];
  }
}
