import { RepositoryContext, RuntimeContext } from '../../shared/types/repository';
import { ctxError } from '../../shared/errors/factories';
import { Asset } from '../../shared/types/assets';

export interface BudgetConfig {
  total_tokens?: number;
  strategy?: 'priority_trim' | 'hard_limit';
  distribution?: {
    rules: number;
    knowledge: number;
    prompts: number;
    workflows: number;
    metadata: number;
  };
}

export class BudgetAllocator {
  allocate(context: RepositoryContext, config: BudgetConfig = {}): RuntimeContext {
    const totalTokens = config.total_tokens || 10000;
    const strategy = config.strategy || 'priority_trim';
    const dist = config.distribution || {
      rules: 0.30,
      knowledge: 0.40,
      prompts: 0.15,
      workflows: 0.10,
      metadata: 0.05
    };

    // Calculate limit per asset type
    const limits = {
      rules: Math.floor(totalTokens * dist.rules),
      knowledge: Math.floor(totalTokens * dist.knowledge),
      prompts: Math.floor(totalTokens * dist.prompts),
      workflows: Math.floor(totalTokens * dist.workflows),
      metadata: Math.floor(totalTokens * dist.metadata)
    };

    const estimateTokens = (content: string) => Math.ceil(content.length / 4);

    const allocated = {
      rules: 0,
      knowledge: 0,
      prompts: 0,
      workflows: 0,
      metadata: 0
    };

    const trimOrLimit = <T extends Asset>(
      assets: T[],
      limit: number,
      type: keyof typeof allocated
    ): T[] => {
      const result: T[] = [];
      for (const asset of assets) {
        const tokens = estimateTokens(asset.content || '');
        if (allocated[type] + tokens <= limit) {
          result.push(asset);
          allocated[type] += tokens;
        } else {
          if (strategy === 'hard_limit') {
            throw ctxError('CTX_003', { details: `Budget exceeded hard limit: ${type} exceeds allocated ${limit} tokens` });
          }
          // trim (skip this and subsequent)
        }
      }
      return result;
    };

    const finalRules = trimOrLimit(context.assets.rules, limits.rules, 'rules');
    const finalKnowledge = trimOrLimit(context.assets.knowledge, limits.knowledge, 'knowledge');
    const finalPrompts = trimOrLimit(context.assets.prompts, limits.prompts, 'prompts');
    const finalWorkflows = trimOrLimit(context.assets.workflows, limits.workflows, 'workflows');

    const totalUsed = allocated.rules + allocated.knowledge + allocated.prompts + allocated.workflows;

    const runtimeContext: RuntimeContext = {
      ...context,
      taskContext: {},
      budget: {
        totalTokens,
        allocated: {
          rules: allocated.rules,
          knowledge: allocated.knowledge,
          prompts: allocated.prompts,
          workflows: allocated.workflows,
          metadata: allocated.metadata
        },
        remaining: totalTokens - totalUsed
      },
      rankedRules: finalRules,
      relevantKnowledge: finalKnowledge,
      activeWorkflow: finalWorkflows[0] || null,
      availableCapabilities: context.assets.capabilities.map(c => c.metadata.id)
    };

    return runtimeContext;
  }
}
