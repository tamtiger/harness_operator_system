import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
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
        // Write proposed content to a temp file, pass file path instead of YAML string
        const tmpDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'harness-pub-')));
        const tmpFile = path.join(tmpDir, `${proposal.targetAsset || 'asset'}.yaml`);
        fs.writeFileSync(tmpFile, proposal.proposedContent, 'utf8');

        const invokeRes = await this.registry.invoke('harness.git.commit', {
          permissions: ['execute_command']
        } as any, {
          message: request.commitMessage || `Publish asset: ${proposal.targetAsset}`,
          files: [tmpFile]
        });

        // Cleanup temp file
        try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }

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
