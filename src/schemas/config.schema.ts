import { z } from 'zod'

const RiskLevelSchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])

export const ProjectConfigSchema = z.object({
  namespace: z
    .string()
    .min(1)
    .regex(/^[a-z0-9_-]+$/, 'Namespace must be lowercase alphanumeric with hyphens/underscores'),
  language: z.string().min(1),
  framework: z.string().min(1),
  approval: z
    .object({
      auto_approve_risk: z.array(RiskLevelSchema).optional().default(['LOW']),
      approval_timeout_minutes: z.number().positive().nullable().optional().default(null),
    })
    .optional()
    .default({}),
  plugins: z.array(z.string()).optional().default([]),
  team: z.object({ approvers: z.array(z.string()).optional().default([]) }).optional().default({}),
  cost: z
    .object({
      warn_per_task_usd: z.number().positive().optional().default(0.50),
      block_per_task_usd: z.number().positive().optional().default(2.00),
    })
    .optional()
    .default({}),
  knowledge: z
    .object({
      include: z
        .array(z.string())
        .optional()
        .default([])
        .refine(
          (paths) => paths.every((p) => !p.startsWith('/') && !p.includes('..')),
          { message: 'Knowledge paths must be relative and cannot contain ".."' },
        ),
    })
    .optional()
    .default({}),
  context: z.object({ budget_tokens: z.number().positive().optional() }).optional().default({}),
})

export type ValidatedProjectConfig = z.infer<typeof ProjectConfigSchema>
