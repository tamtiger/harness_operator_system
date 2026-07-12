import { Proposal } from '../../shared/types/governance';
import { ProposalStatus } from '../../shared/types/enums';
import { ProposalId } from '../../shared/types/primitives';
import { govError } from '../../shared/errors/factories';
import { ProposalManager } from '../proposal/ProposalManager';
import { AuditLogger } from '../audit/AuditLogger';

export class ApprovalEngine {
  constructor(
    private proposals: ProposalManager,
    private audit: AuditLogger
  ) {}

  approve(id: ProposalId, reviewer: string, comments: string): Proposal {
    const proposal = this.proposals.get(id);

    if (proposal.status !== ProposalStatus.REVIEWING) {
      throw govError('GOV_002');
    }

    const lockedBy = (proposal as any).lockedBy;
    if (lockedBy !== reviewer) {
      throw govError('GOV_007');
    }

    const prevStatus = proposal.status;
    proposal.status = ProposalStatus.APPROVED;
    proposal.approvedAt = new Date().toISOString();
    (proposal as any).lockedBy = '';
    (proposal as any).lockedAt = '';
    proposal.updatedAt = new Date().toISOString();

    if (comments) {
      proposal.comments.push({
        id: 'c-' + Math.random().toString(36).substring(2, 9),
        author: reviewer,
        content: comments,
        timestamp: new Date().toISOString()
      });
    }

    this.proposals.persist(proposal);

    this.audit.log({
      id: 'aud-' + Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      action: 'proposal_approved',
      actor: reviewer,
      proposalId: id,
      previousStatus: prevStatus,
      newStatus: proposal.status,
      details: comments || 'Approved'
    });

    return proposal;
  }

  reject(id: ProposalId, reviewer: string, comments: string): Proposal {
    const proposal = this.proposals.get(id);

    if (proposal.status !== ProposalStatus.REVIEWING) {
      throw govError('GOV_002');
    }

    const lockedBy = (proposal as any).lockedBy;
    if (lockedBy !== reviewer) {
      throw govError('GOV_007');
    }

    const prevStatus = proposal.status;
    proposal.status = ProposalStatus.REJECTED;
    proposal.reviewedAt = new Date().toISOString();
    (proposal as any).lockedBy = '';
    (proposal as any).lockedAt = '';
    proposal.updatedAt = new Date().toISOString();

    if (comments) {
      proposal.comments.push({
        id: 'c-' + Math.random().toString(36).substring(2, 9),
        author: reviewer,
        content: comments,
        timestamp: new Date().toISOString()
      });
    }

    this.proposals.persist(proposal);

    this.audit.log({
      id: 'aud-' + Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      action: 'proposal_rejected',
      actor: reviewer,
      proposalId: id,
      previousStatus: prevStatus,
      newStatus: proposal.status,
      details: comments || 'Rejected'
    });

    return proposal;
  }
}
