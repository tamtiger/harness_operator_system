import { RepositoryContext } from '../../shared/types/repository';
import { TaskRequest } from '../../shared/types/execution';
import { Rule, Knowledge, Workflow, Prompt, SkillAsset } from '../../shared/types/assets';

export interface FilterConfig {
  min_confidence?: 'high' | 'medium' | 'low';
  include_deprecated?: boolean;
  scope_strict?: boolean;
}

export class ContextFilter {
  filter(context: RepositoryContext, request: TaskRequest, config: FilterConfig = {}): RepositoryContext {
    const minConfidence = config.min_confidence || 'medium';
    const includeDeprecated = config.include_deprecated || false;

    const confidenceValue = (c: string) => {
      if (c === 'high') return 3;
      if (c === 'medium') return 2;
      return 1; // low
    };

    const targetConfValue = confidenceValue(minConfidence);

    // Filter rules
    const filteredRules = context.assets.rules.filter((rule: Rule) => {
      if (!includeDeprecated && rule.metadata.deprecated) {
        return false;
      }
      // Path scope check — exact directory boundary
      if (rule.metadata.tags && rule.metadata.tags.some(t => t.startsWith('scope:'))) {
        const scopes = rule.metadata.tags
          .filter(t => t.startsWith('scope:'))
          .map(t => t.substring(6));
        
        if (scopes.length > 0 && request.workingDirectory) {
          const wd = request.workingDirectory.replace(/\\/g, '/');
          const matched = scopes.some(scope => {
            const normalized = scope.replace(/\\/g, '/');
            return wd === normalized || wd.startsWith(normalized.endsWith('/') ? normalized : normalized + '/');
          });
          if (!matched) return false;
        }
      }
      return true;
    });

    // Filter knowledge
    const filteredKnowledge = context.assets.knowledge.filter((knowledge: Knowledge) => {
      if (!includeDeprecated && knowledge.metadata.deprecated) {
        return false;
      }
      
      // Tag overlap check
      if (request.tags && request.tags.length > 0) {
        const assetTags = knowledge.metadata.tags || [];
        const hasOverlap = request.tags.some(tag => assetTags.includes(tag));
        if (!hasOverlap) return false;
      }

      // Confidence check
      const conf = knowledge.confidence || 'medium';
      if (confidenceValue(conf) < targetConfValue) {
        return false;
      }

      return true;
    });

    // Filter workflows
    const filteredWorkflows = context.assets.workflows.filter((wf: Workflow) => {
      if (!includeDeprecated && wf.metadata.deprecated) {
        return false;
      }
      const triggers = wf.triggers || [];
      if (triggers.length > 0 && request.taskType) {
        if (!triggers.includes(request.taskType)) {
          return false;
        }
      }
      return true;
    });

    // Keep all prompts and capabilities for now (not filtered unless deprecated)
    const filteredPrompts = context.assets.prompts.filter((p: Prompt) => includeDeprecated || !p.metadata.deprecated);

    // Filter skills based on trigger match
    const filteredSkills = (context.assets.skills || []).filter((skill: SkillAsset) => {
      if (!includeDeprecated && skill.metadata.deprecated) {
        return false;
      }
      const triggers = skill.triggers || [];
      if (triggers.includes('any')) {
        return true;
      }
      if (request.taskType && triggers.includes(request.taskType)) {
        return true;
      }
      if (request.tags && request.tags.some(tag => triggers.includes(tag))) {
        return true;
      }
      return false;
    });

    return {
      ...context,
      assets: {
        ...context.assets,
        rules: filteredRules,
        knowledge: filteredKnowledge,
        workflows: filteredWorkflows,
        prompts: filteredPrompts,
        skills: filteredSkills
      }
    };
  }
}
