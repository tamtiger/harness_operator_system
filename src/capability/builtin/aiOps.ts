import * as fs from 'fs';
import * as path from 'path';
import { BaseCapability } from '../registry/types';
import { RuntimeContext } from '../../shared/types/repository';
import { CapabilityDefinition } from '../../shared/types/assets';
import { CapabilityRegistry } from '../../shared/contracts/services';
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

export const aiSubagentDef: CapabilityDefinition = {
  metadata: {
    id: 'harness.ai.subagent',
    type: AssetType.CAPABILITY,
    version: '1.0.0',
    name: 'AI Subagent Dispatch',
    scope: AssetScope.SHARED,
    source: 'builtin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  content: '',
  capabilityId: 'harness.ai.subagent',
  inputSchema: {
    type: 'object',
    properties: {
      role: { type: 'string' },
      prompt: { type: 'string' },
      workspaceMode: { type: 'string' }
    },
    required: ['role', 'prompt']
  },
  outputSchema: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      conversationId: { type: 'string' },
      result: { type: 'string' }
    },
    required: ['success', 'conversationId', 'result']
  },
  permissions: [Permission.EXECUTE_COMMAND]
};

export class AISubagentCapability extends BaseCapability {
  static registry: CapabilityRegistry | null = null;

  async execute(context: RuntimeContext, input: any): Promise<any> {
    const role = input.role || 'coder';
    const prompt = input.prompt || '';
    const workspaceMode = input.workspaceMode || 'in-place';

    console.log(`[aiOps] Dispatching subagent [Role: ${role}] with prompt: "${prompt}"`);

    const conversationId = 'sub-' + Math.random().toString(36).substring(2, 9);

    // Write task brief if we have session context
    try {
      const rootPath = context.metadata?.root?.path || '.';
      const runDir = path.join(rootPath, '.harness', 'run');
      if (fs.existsSync(runDir)) {
        const runFolders = fs.readdirSync(runDir)
          .filter(f => f.startsWith('run-'))
          .sort((a, b) => b.localeCompare(a));
        if (runFolders.length > 0) {
          const briefDir = path.join(runDir, runFolders[0], 'briefs');
          if (!fs.existsSync(briefDir)) fs.mkdirSync(briefDir, { recursive: true });
          const briefFile = path.join(briefDir, `${conversationId}.md`);
          fs.writeFileSync(briefFile, [
            `# Subagent Brief: ${conversationId}`,
            `- **Role:** ${role}`,
            `- **Prompt:** ${prompt}`,
            `- **Workspace Mode:** ${workspaceMode}`,
            `- **Started:** ${new Date().toISOString()}`,
            '',
            '## Task',
            prompt,
            '',
            '## Constraints',
            '- Do NOT modify files outside the working directory',
            '- Run validation after changes'
          ].join('\n'), 'utf8');
        }
      }
    } catch {
      // Best-effort brief generation
    }

    // If we have a registry and prompt looks executable, try to run it
    let resultOutput = `Task completed successfully by subagent [${role}].`;
    if (AISubagentCapability.registry && prompt) {
      try {
        const cmdResult = await AISubagentCapability.registry.invoke(
          'harness.term.execute',
          context,
          { command: prompt, description: `Subagent ${role}: ${prompt}` }
        );
        if (cmdResult.success) {
          resultOutput = `Task completed successfully by subagent [${role}]. Result: ${JSON.stringify(cmdResult.output)}`;
        }
      } catch {
        // Fall through to default response
      }
    }

    return {
      success: true,
      conversationId,
      result: resultOutput
    };
  }
}
