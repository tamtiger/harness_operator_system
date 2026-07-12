import { ProposalStatus } from '../../shared/types/enums';
import { ProposalId } from '../../shared/types/primitives';
import { RepositoryRoot } from '../../shared/types/repository';
import { PromotionResult } from '../../shared/types/platform';
import { govError } from '../../shared/errors/factories';
import { RepositoryService } from '../../shared/contracts/services';
import { ProposalManager } from '../proposal/ProposalManager';
import { AuditLogger } from '../audit/AuditLogger';

export class PromotionEngine {
  constructor(
    private proposals: ProposalManager,
    private repo: RepositoryService,
    private root: RepositoryRoot,
    private audit: AuditLogger
  ) {}

  promote(id: ProposalId): PromotionResult {
    const proposal = this.proposals.get(id);

    if (proposal.status !== ProposalStatus.APPROVED) {
      throw govError('GOV_002');
    }

    // Parse asset type from proposedContent YAML
    let assetType = 'rule';
    const typeMatch = proposal.proposedContent.match(/^type:\s*["']?(\w+)["']?/m);
    if (typeMatch) {
      assetType = typeMatch[1];
    }

    const folderMap: Record<string, string> = {
      rule: 'rules',
      prompt: 'prompts',
      template: 'templates',
      workflow: 'workflows',
      knowledge: 'knowledge',
      hook: 'hooks',
      capability: 'capabilities'
    };
    
    const folder = folderMap[assetType] || (assetType + 's');
    
    let assetId = proposal.targetAsset;
    if (!assetId) {
      const idMatch = proposal.proposedContent.match(/^id:\s*["']?([a-zA-Z0-9_-]+)["']?/m);
      if (idMatch) {
        assetId = idMatch[1];
      }
    }
    if (!assetId) {
      assetId = proposal.id;
    }

    const ext = assetType === 'knowledge' ? 'md' : 'yaml';
    const targetPath = `.harness/${folder}/${assetId}.${ext}`;

    // Ensure scope: local is present in promoted content
    let content = proposal.proposedContent;
    if (!/^scope:\s*\w+/m.test(content)) {
      content = `scope: local\n${content}`;
    }
    if (!content.endsWith('\n')) content += '\n';

    this.repo.persist(this.root, targetPath, content);

    const prevStatus = proposal.status;
    proposal.status = ProposalStatus.PROMOTED;
    proposal.promotedAt = new Date().toISOString();
    proposal.updatedAt = new Date().toISOString();

    this.proposals.persist(proposal);

    this.audit.log({
      id: 'aud-' + Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      action: 'proposal_promoted',
      actor: 'system',
      proposalId: id,
      previousStatus: prevStatus,
      newStatus: proposal.status,
      details: `Asset promoted to ${targetPath}`
    });

    return {
      proposalId: id,
      promotedAssetPath: targetPath,
      promotedAt: proposal.promotedAt!
    };
  }
}
