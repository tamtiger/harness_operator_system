import { PublishRequest, PublishResult } from '../../shared/types/platform';
import { GovernanceService, CapabilityRegistry } from '../../shared/contracts/services';
import { ProposalStatus } from '../../shared/types/enums';
import { pltError } from '../../shared/errors/factories';

export class AssetPublisher {
  constructor(
    private governance: GovernanceService,
    private registry: CapabilityRegistry
  ) {}

  async publish(request: PublishRequest): Promise<PublishResult> {
    try {
      const promoted = this.governance.listProposals({ status: ProposalStatus.PROMOTED });
      const idsToPublish = request.assetIds;

      // Filter targeted proposals
      const targets = promoted.filter(p => p.targetAsset && idsToPublish.includes(p.targetAsset));

      if (targets.length === 0) {
        return {
          success: true
        };
      }

      // Publish each asset via capability registry invocation
      for (const proposal of targets) {
        const invokeRes = await this.registry.invoke('harness.git.commit', {
          permissions: ['execute_command']
        } as any, {
          message: request.commitMessage || `Publish asset: ${proposal.targetAsset}`,
          files: [proposal.proposedContent]
        });

        if (!invokeRes.success) {
          throw new Error(`Failed to commit asset changes: ${invokeRes.error?.message}`);
        }
      }

      return {
        success: true
      };
    } catch (err: any) {
      throw pltError('PLT_006', { reason: err.message });
    }
  }
}
