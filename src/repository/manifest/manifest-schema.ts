import { z } from 'zod';

export const ManifestSchema = z.object({
  version: z.literal(2),
  specification: z.literal('4.0'),
  repository: z.object({
    name: z.string().regex(/^[a-z0-9-]+$/).max(64).optional(),
    root: z.string(),
    description: z.string().optional(),
  }),
  agent: z.object({
    entry_point: z.string(),
    context: z.object({
      token_budget: z.number().int().positive().optional(),
      budget_strategy: z.enum(['priority_trim', 'hard_limit']).optional(),
    }).optional(),
  }),
  sources: z.array(z.object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    type: z.enum(['git', 'local_path', 'registry']),
    uri: z.string(),
    version: z.string().optional(),
    verified: z.boolean().optional(),
  })).optional(),
  capabilities: z.array(z.object({
    id: z.string(),
    source: z.enum(['shared', 'local', 'external']),
    path: z.string().optional(),
    package: z.string().optional(),
    version: z.string().optional(),
  })).optional(),
  artifacts: z.array(z.object({
    type: z.enum(['repository-map', 'rule', 'prompt', 'template', 'workflow', 'knowledge', 'hook', 'adr']),
    path: z.string(),
  })).min(1),
  governance: z.object({
    auto_submit_proposals: z.boolean().optional(),
    require_evidence: z.boolean().optional(),
    min_evidence_count: z.number().int().optional(),
  }).optional(),
  vendor: z.record(z.string(), z.unknown()).optional(),
}).strict(); // strict to enforce no custom fields outside vendor (except vendor itself)
