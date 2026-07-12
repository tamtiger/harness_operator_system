import { Proposal } from '../../shared/types/governance';
import { ProposalStatus } from '../../shared/types/enums';
import { ProposalId } from '../../shared/types/primitives';
import { govError } from '../../shared/errors/factories';
import { ProposalManager } from '../proposal/ProposalManager';
import { AuditLogger } from '../audit/AuditLogger';

export class ReviewManager {
  constructor(
    private proposals: ProposalManager,
    private audit: AuditLogger
  ) {}

  startReview(id: ProposalId, reviewer: string): Proposal {
    const proposal = this.proposals.get(id);

    if (proposal.status !== ProposalStatus.SUBMITTED && proposal.status !== ProposalStatus.REVIEWING) {
      throw govError('GOV_002');
    }

    const lockedBy = proposal.lockedBy;
    const lockedAt = proposal.lockedAt;

    if (lockedBy && lockedBy !== reviewer) {
      // Check timeout
      const lockedTime = new Date(lockedAt!).getTime();
      const elapsedMinutes = (Date.now() - lockedTime) / (1000 * 60);
      if (elapsedMinutes <= 30) {
        throw govError('GOV_003');
      }
    }

    const prevStatus = proposal.status;
    proposal.status = ProposalStatus.REVIEWING;
    proposal.lockedBy = reviewer;
    proposal.lockedAt = new Date().toISOString();
    proposal.updatedAt = new Date().toISOString();

    if (!proposal.reviewers.includes(reviewer)) {
      proposal.reviewers.push(reviewer);
    }

    this.proposals.persist(proposal);

    this.audit.log({
      id: 'aud-' + Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      action: 'review_started',
      actor: reviewer,
      proposalId: id,
      previousStatus: prevStatus,
      newStatus: proposal.status,
      details: `Review locked by ${reviewer}`
    });

    return proposal;
  }

  requestChanges(id: ProposalId, reviewer: string, comments: string): Proposal {
    const proposal = this.proposals.get(id);

    if (proposal.status !== ProposalStatus.REVIEWING) {
      throw govError('GOV_002');
    }

    const lockedBy = proposal.lockedBy;
    if (lockedBy !== reviewer) {
      throw govError('GOV_007');
    }

    const prevStatus = proposal.status;
    proposal.status = ProposalStatus.DRAFT;
    proposal.lockedBy = '';
    proposal.lockedAt = '';
    proposal.updatedAt = new Date().toISOString();

    proposal.comments.push({
      id: 'c-' + Math.random().toString(36).substring(2, 9),
      author: reviewer,
      content: comments,
      timestamp: new Date().toISOString()
    });

    this.proposals.persist(proposal);

    this.audit.log({
      id: 'aud-' + Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      action: 'changes_requested',
      actor: reviewer,
      proposalId: id,
      previousStatus: prevStatus,
      newStatus: proposal.status,
      details: comments
    });

    return proposal;
  }
}
