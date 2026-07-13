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

    const lockedBy = proposal.lockedBy;
    const lockedAt = proposal.lockedAt;
    let isAuthorized = !lockedBy || lockedBy === reviewer;

    if (lockedBy && lockedBy !== reviewer) {
      const lockedTime = new Date(lockedAt!).getTime();
      const elapsedMinutes = (Date.now() - lockedTime) / (1000 * 60);
      if (elapsedMinutes > 30) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      throw govError('GOV_007');
    }

    const prevStatus = proposal.status;
    proposal.status = ProposalStatus.APPROVED;
    proposal.approvedAt = new Date().toISOString();
    proposal.lockedBy = '';
    proposal.lockedAt = '';
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

    const lockedBy = proposal.lockedBy;
    const lockedAt = proposal.lockedAt;
    let isAuthorized = !lockedBy || lockedBy === reviewer;

    if (lockedBy && lockedBy !== reviewer) {
      const lockedTime = new Date(lockedAt!).getTime();
      const elapsedMinutes = (Date.now() - lockedTime) / (1000 * 60);
      if (elapsedMinutes > 30) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      throw govError('GOV_007');
    }

    const prevStatus = proposal.status;
    proposal.status = ProposalStatus.REJECTED;
    proposal.reviewedAt = new Date().toISOString();
    proposal.lockedBy = '';
    proposal.lockedAt = '';
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
