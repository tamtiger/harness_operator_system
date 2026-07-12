import { RepositoryContext } from '../../shared/types/repository';
import { TaskRequest } from '../../shared/types/execution';
import { Rule, Knowledge, Asset } from '../../shared/types/assets';

export interface RankingConfig {
  strategy?: 'weighted';
  weights?: {
    priority: number;
    recency: number;
    relevance: number;
  };
}

export class ContextRanker {
  rank(context: RepositoryContext, request: TaskRequest, config: RankingConfig = {}): RepositoryContext {
    const weights = config.weights || { priority: 0.4, recency: 0.3, relevance: 0.3 };

    const scoreAsset = (asset: Asset): number => {
      // 1. Priority Score
      const priority = (asset.metadata as any).priority || 'medium';
      let priorityScore = 0.5;
      if (priority === 'critical') priorityScore = 1.0;
      else if (priority === 'high') priorityScore = 0.75;
      else if (priority === 'medium') priorityScore = 0.5;
      else if (priority === 'low') priorityScore = 0.25;

      // 2. Recency Score
      const updatedAt = asset.metadata.updatedAt ? new Date(asset.metadata.updatedAt).getTime() : Date.now();
      const ageMs = Date.now() - updatedAt;
      const maxAgeMs = 90 * 24 * 60 * 60 * 1000; // 90 days
      const recencyScore = Math.max(0, Math.min(1, 1 - ageMs / maxAgeMs));

      // 3. Relevance Score (Tag Overlap)
      let relevanceScore = 0.0;
      const assetTags = asset.metadata.tags || [];
      const requestTags = request.tags || [];
      if (requestTags.length > 0 && assetTags.length > 0) {
        const matches = requestTags.filter(tag => assetTags.includes(tag)).length;
        relevanceScore = matches / Math.max(assetTags.length, 1);
      }

      return (priorityScore * weights.priority) + (recencyScore * weights.recency) + (relevanceScore * weights.relevance);
    };

    const sortByScore = <T extends Asset>(list: T[]): T[] => {
      return [...list].sort((a, b) => scoreAsset(b) - scoreAsset(a));
    };

    return {
      ...context,
      assets: {
        ...context.assets,
        rules: sortByScore(context.assets.rules),
        knowledge: sortByScore(context.assets.knowledge),
        prompts: sortByScore(context.assets.prompts),
        workflows: sortByScore(context.assets.workflows)
      }
    };
  }
}
