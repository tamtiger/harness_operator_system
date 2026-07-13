import { RepositoryContext, RuntimeContext } from '../../shared/types/repository';
import { ctxError } from '../../shared/errors/factories';
import { Asset, SkillAsset } from '../../shared/types/assets';
import { Permission } from '../../shared/types/enums';

export interface BudgetConfig {
  total_tokens?: number;
  strategy?: 'priority_trim' | 'hard_limit';
  distribution?: {
    rules: number;
    knowledge: number;
    prompts: number;
    workflows: number;
    metadata: number;
    skills?: number;
  };
}

export class BudgetAllocator {
  allocate(context: RepositoryContext, config: BudgetConfig = {}): RuntimeContext {
    const totalTokens = config.total_tokens || 10000;
    const strategy = config.strategy || 'priority_trim';
    const dist = {
      rules: config.distribution?.rules ?? 0.25,
      knowledge: config.distribution?.knowledge ?? 0.35,
      prompts: config.distribution?.prompts ?? 0.15,
      workflows: config.distribution?.workflows ?? 0.10,
      skills: config.distribution?.skills ?? 0.10,
      metadata: config.distribution?.metadata ?? 0.05
    };

    // Calculate limit per asset type
    const limits = {
      rules: Math.floor(totalTokens * dist.rules),
      knowledge: Math.floor(totalTokens * dist.knowledge),
      prompts: Math.floor(totalTokens * dist.prompts),
      workflows: Math.floor(totalTokens * dist.workflows),
      skills: Math.floor(totalTokens * dist.skills),
      metadata: Math.floor(totalTokens * dist.metadata)
    };

    const estimateTokens = (content: string) => Math.ceil(content.length / 4);

    const allocated = {
      rules: 0,
      knowledge: 0,
      prompts: 0,
      workflows: 0,
      skills: 0,
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
            throw ctxError('CTX_003', { tokens: allocated[type] + tokens, limit });
          }
          // trim (skip this and subsequent)
        }
      }
      return result;
    };

    const finalRules = trimOrLimit(context.assets.rules, limits.rules, 'rules');
    const finalKnowledge = trimOrLimit(context.assets.knowledge, limits.knowledge, 'knowledge');
    const finalWorkflows = trimOrLimit(context.assets.workflows, limits.workflows, 'workflows');
    const finalSkills = trimOrLimit(context.assets.skills || [], limits.skills, 'skills');

    // Consume metadata slot: estimate from metadata fields
    allocated.metadata = estimateTokens(JSON.stringify(context.metadata));

    const totalUsed = allocated.rules + allocated.knowledge + allocated.prompts + allocated.workflows + allocated.skills + allocated.metadata;

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
          metadata: allocated.metadata,
          skills: allocated.skills
        },
        remaining: totalTokens - totalUsed
      },
      rankedRules: finalRules,
      relevantKnowledge: finalKnowledge,
      activeWorkflow: finalWorkflows[0] || null,
      injectedSkills: finalSkills,
      availableCapabilities: context.assets.capabilities.map(c => c.metadata.id),
      permissions: [
        Permission.READ_FILE,
        Permission.WRITE_FILE,
        Permission.GIT_WRITE,
        Permission.PROPOSAL_CREATE,
        Permission.EXECUTE_COMMAND,
        Permission.NETWORK_ACCESS
      ]
    };

    return runtimeContext;
  }
}
