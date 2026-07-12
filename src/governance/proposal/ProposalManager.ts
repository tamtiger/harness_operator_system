import { ProposalRequest, ProposalFilter } from '../../shared/types/platform';
import { Proposal } from '../../shared/types/governance';
import { ProposalStatus } from '../../shared/types/enums';
import { ProposalId, RelativePath } from '../../shared/types/primitives';
import { RepositoryRoot } from '../../shared/types/repository';
import { RepositoryService } from '../../shared/contracts/services';
import { govError } from '../../shared/errors/factories';
import { serializeProposal, deserializeProposal } from './ProposalFileFormat';
import { AuditLogger } from '../audit/AuditLogger';

export class ProposalManager {
  private proposalCache = new Map<ProposalId, Proposal>();

  constructor(
    private repo: RepositoryService,
    private root: RepositoryRoot,
    private audit: AuditLogger
  ) {}

  private getProposalsDir(): RelativePath {
    return '.harness/proposals';
  }

  private ensureDirExists() {
    this.repo.ensureDir(this.root, this.getProposalsDir());
  }

  create(request: ProposalRequest): Proposal {
    this.ensureDirExists();
    
    // Generate sequential ID
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const prefix = `PROP-${today}-`;
    
    let maxSeq = 0;
    try {
      const files = this.repo.readDir(this.root, this.getProposalsDir());
      files.forEach(file => {
        if (file.startsWith(prefix) && file.endsWith('.md')) {
          const seqStr = file.replace(prefix, '').replace('.md', '');
          const seq = parseInt(seqStr, 10);
          if (!isNaN(seq) && seq > maxSeq) {
            maxSeq = seq;
          }
        }
      });
    } catch (e) {
      // ignore directory not found or unreadable
    }

    const nextSeq = String(maxSeq + 1).padStart(3, '0');
    const id = `${prefix}${nextSeq}`;

    const proposal: Proposal = {
      id,
      title: request.title,
      description: request.description,
      type: request.type,
      status: ProposalStatus.DRAFT,
      rationale: request.rationale,
      proposedContent: request.proposedContent,
      evidence: request.evidence || [],
      targetAsset: request.targetAsset,
      author: 'ai-agent',
      reviewers: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      comments: [],
      tags: []
    };

    this.persist(proposal);

    return proposal;
  }

  submit(id: ProposalId): Proposal {
    const proposal = this.get(id);

    if (!proposal.evidence || proposal.evidence.length < 1) {
      throw govError('GOV_004');
    }

    if (proposal.status !== ProposalStatus.DRAFT) {
      throw govError('GOV_002');
    }

    const prevStatus = proposal.status;
    proposal.status = ProposalStatus.SUBMITTED;
    proposal.updatedAt = new Date().toISOString();

    this.persist(proposal);

    this.audit.log({
      id: 'aud-' + Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      action: 'proposal_submitted',
      actor: proposal.author,
      proposalId: id,
      previousStatus: prevStatus,
      newStatus: proposal.status,
      details: 'Proposal submitted with evidence'
    });

    return proposal;
  }

  get(id: ProposalId): Proposal {
    const cached = this.proposalCache.get(id);
    if (cached) {
      return { ...cached };
    }

    this.ensureDirExists();
    const fileRelPath = `.harness/proposals/${id}.md`;
    if (!this.repo.fileExists(this.root, fileRelPath)) {
      throw govError('GOV_001');
    }

    try {
      const content = this.repo.readFile(this.root, fileRelPath);
      const proposal = deserializeProposal(content);
      this.proposalCache.set(id, { ...proposal });
      return proposal;
    } catch (err: any) {
      throw govError('GOV_001', err.message);
    }
  }

  list(filter: ProposalFilter): Proposal[] {
    this.ensureDirExists();
    const list: Proposal[] = [];
    try {
      const files = this.repo.readDir(this.root, this.getProposalsDir());
      files.forEach(file => {
        if (file.endsWith('.md')) {
          const id = file.replace('.md', '');
          const cached = this.proposalCache.get(id);
          if (cached) {
            list.push(cached);
            return;
          }
          try {
            const content = this.repo.readFile(this.root, `.harness/proposals/${file}`);
            const prop = deserializeProposal(content);
            this.proposalCache.set(id, { ...prop });
            list.push(prop);
          } catch (e) {
            // skip corrupted files
          }
        }
      });
    } catch (e) {
      // ignore directory issues
    }

    let filtered = list;
    if (filter.status) {
      filtered = filtered.filter(p => p.status === filter.status);
    }
    if (filter.type) {
      filtered = filtered.filter(p => p.type === filter.type);
    }
    if (filter.author) {
      filtered = filtered.filter(p => p.author === filter.author);
    }
    return filtered;
  }

  persist(proposal: Proposal) {
    const content = serializeProposal(proposal);
    this.repo.persist(this.root, `.harness/proposals/${proposal.id}.md`, content);
    // Update cache with latest state
    this.proposalCache.set(proposal.id, { ...proposal });
  }

  invalidateCache(id: ProposalId): void {
    this.proposalCache.delete(id);
  }
}
