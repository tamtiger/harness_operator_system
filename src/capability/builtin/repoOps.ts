import { BaseCapability } from '../registry/types';
import { RuntimeContext } from '../../shared/types/repository';
import { CapabilityDefinition } from '../../shared/types/assets';
import { AssetType, AssetScope, Permission } from '../../shared/types/enums';

export const repoReadAssetDef: CapabilityDefinition = {
  metadata: {
    id: 'harness.repo.read_asset',
    type: AssetType.CAPABILITY,
    version: '1.0.0',
    name: 'Read Repo Asset',
    scope: AssetScope.SHARED,
    source: 'builtin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  content: '',
  capabilityId: 'harness.repo.read_asset',
  inputSchema: {
    type: 'object',
    properties: {
      assetId: { type: 'string' }
    },
    required: ['assetId']
  },
  outputSchema: {
    type: 'object',
    properties: {
      asset: { type: 'object' }
    },
    required: ['asset']
  },
  permissions: [Permission.READ_FILE]
};

export class RepoReadAssetCapability extends BaseCapability {
  async execute(context: RuntimeContext, input: any): Promise<any> {
    const allAssets = [
      ...context.assets.rules,
      ...context.assets.prompts,
      ...context.assets.templates,
      ...context.assets.workflows,
      ...context.assets.knowledge,
      ...context.assets.hooks,
      ...context.assets.capabilities
    ];
    const asset = allAssets.find(a => a.metadata.id === input.assetId);
    if (!asset) {
      throw new Error(`Asset not found: ${input.assetId}`);
    }
    // Return asset copy
    return {
      asset: {
        metadata: asset.metadata,
        content: asset.content
      }
    };
  }
}

export const repoCreateProposalDef: CapabilityDefinition = {
  metadata: {
    id: 'harness.repo.create_proposal',
    type: AssetType.CAPABILITY,
    version: '1.0.0',
    name: 'Create Asset Proposal',
    scope: AssetScope.SHARED,
    source: 'builtin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  content: '',
  capabilityId: 'harness.repo.create_proposal',
  inputSchema: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      description: { type: 'string' },
      type: { type: 'string' },
      rationale: { type: 'string' },
      proposedContent: { type: 'string' }
    },
    required: ['title', 'description', 'type', 'proposedContent']
  },
  outputSchema: {
    type: 'object',
    properties: {
      proposal: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          status: { type: 'string' },
          createdAt: { type: 'string' }
        },
        required: ['id', 'title', 'status', 'createdAt']
      }
    },
    required: ['proposal']
  },
  permissions: [Permission.PROPOSAL_CREATE]
};

export class RepoCreateProposalCapability extends BaseCapability {
  async execute(context: RuntimeContext, input: any): Promise<any> {
    return {
      proposal: {
        id: 'prop-' + Math.random().toString(36).substring(2, 9),
        title: input.title,
        status: 'pending',
        createdAt: new Date().toISOString()
      }
    };
  }
}
