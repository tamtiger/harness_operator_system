import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { PublishRequest, PublishResult } from '../../shared/types/platform';
import { GovernanceService, CapabilityRegistry } from '../../shared/contracts/services';
import { ProposalStatus, Permission } from '../../shared/types/enums';
import { RuntimeContext } from '../../shared/types/repository';
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

        const invokeContext: RuntimeContext = {
          metadata: { root: { path: '', hasGit: false, discoveredAt: '' }, manifest: { version: 0, specification: '', repository: { root: '' }, agent: { entry_point: '' }, artifacts: [] } },
          buildTimestamp: '',
          assets: { rules: [], prompts: [], templates: [], workflows: [], knowledge: [], hooks: [], capabilities: [] },
          taskContext: {},
          budget: { totalTokens: 0, allocated: { rules: 0, knowledge: 0, prompts: 0, workflows: 0, metadata: 0 }, remaining: 0 },
          rankedRules: [],
          relevantKnowledge: [],
          availableCapabilities: [],
          permissions: [Permission.EXECUTE_COMMAND]
        };
        const invokeRes = await this.registry.invoke('harness.git.commit', invokeContext, {
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
