import * as fs from 'fs';
import * as path from 'path';
import { ProposalRequest, ProposalFilter } from '../../shared/types/platform';
import { Proposal } from '../../shared/types/governance';
import { ProposalStatus } from '../../shared/types/enums';
import { ProposalId, RepositoryRoot } from '../../shared/types/primitives';
import { RepositoryService } from '../../shared/contracts/services';
import { govError } from '../../shared/errors/factories';
import { serializeProposal, deserializeProposal } from './ProposalFileFormat';
import { AuditLogger } from '../audit/AuditLogger';

export class ProposalManager {
  constructor(
    private repo: RepositoryService,
    private root: RepositoryRoot,
    private audit: AuditLogger
  ) {}

  private getProposalsDir(): string {
    return path.join(this.root.path, '.harness', 'proposals');
  }

  private ensureDirExists() {
    const dir = this.getProposalsDir();
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  create(request: ProposalRequest): Proposal {
    this.ensureDirExists();
    
    // Generate sequential ID
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const prefix = `PROP-${today}-`;
    
    let maxSeq = 0;
    try {
      const files = fs.readdirSync(this.getProposalsDir());
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

    const content = serializeProposal(proposal);
    this.repo.persist(this.root, `.harness/proposals/${id}.md`, content);

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

    const content = serializeProposal(proposal);
    this.repo.persist(this.root, `.harness/proposals/${id}.md`, content);

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
    this.ensureDirExists();
    const filePath = path.join(this.getProposalsDir(), `${id}.md`);
    if (!fs.existsSync(filePath)) {
      throw govError('GOV_001');
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      return deserializeProposal(content);
    } catch (err: any) {
      throw govError('GOV_001', err.message);
    }
  }

  list(filter: ProposalFilter): Proposal[] {
    this.ensureDirExists();
    const list: Proposal[] = [];
    try {
      const files = fs.readdirSync(this.getProposalsDir());
      files.forEach(file => {
        if (file.endsWith('.md')) {
          try {
            const content = fs.readFileSync(path.join(this.getProposalsDir(), file), 'utf8');
            const prop = deserializeProposal(content);
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
  }
}
