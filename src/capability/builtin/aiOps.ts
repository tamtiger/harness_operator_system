import { BaseCapability } from '../registry/types';
import { RuntimeContext } from '../../shared/types/repository';
import { CapabilityDefinition } from '../../shared/types/assets';
import { AssetType, AssetScope, Permission } from '../../shared/types/enums';

export const aiCompleteDef: CapabilityDefinition = {
  metadata: {
    id: 'harness.ai.complete',
    type: AssetType.CAPABILITY,
    version: '1.0.0',
    name: 'AI Completion',
    scope: AssetScope.SHARED,
    source: 'builtin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  content: '',
  capabilityId: 'harness.ai.complete',
  inputSchema: {
    type: 'object',
    properties: {
      prompt: { type: 'string' },
      model: { type: 'string' }
    },
    required: ['prompt']
  },
  outputSchema: {
    type: 'object',
    properties: {
      content: { type: 'string' },
      model: { type: 'string' },
      tokensUsed: { type: 'number' }
    },
    required: ['content', 'model', 'tokensUsed']
  },
  permissions: [Permission.NETWORK_ACCESS]
};

export class AICompleteCapability extends BaseCapability {
  async execute(context: RuntimeContext, input: any): Promise<any> {
    return {
      content: `AI response stub for: "${input.prompt}"`,
      model: input.model || 'gpt-4-mock',
      tokensUsed: 42
    };
  }
}

export const aiEmbedDef: CapabilityDefinition = {
  metadata: {
    id: 'harness.ai.embed',
    type: AssetType.CAPABILITY,
    version: '1.0.0',
    name: 'AI Embedding',
    scope: AssetScope.SHARED,
    source: 'builtin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  content: '',
  capabilityId: 'harness.ai.embed',
  inputSchema: {
    type: 'object',
    properties: {
      text: { type: 'string' },
      model: { type: 'string' }
    },
    required: ['text']
  },
  outputSchema: {
    type: 'object',
    properties: {
      embedding: {
        type: 'array',
        items: { type: 'number' }
      },
      dimensions: { type: 'number' }
    },
    required: ['embedding', 'dimensions']
  },
  permissions: [Permission.NETWORK_ACCESS]
};

export class AIEmbedCapability extends BaseCapability {
  async execute(context: RuntimeContext, input: any): Promise<any> {
    return {
      embedding: [0.1, 0.2, 0.3],
      dimensions: 3
    };
  }
}
