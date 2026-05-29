/**
 * Skill matching engine for tiered keyword-based skill suggestions.
 * Supports tier-based filtering and keyword matching for contextual skill recommendations.
 */

export interface SkillMetadata {
  tier?: number;
  keywords?: string[];
}

export interface SkillWithMetadata {
  name: string;
  description?: string;
  metadata?: SkillMetadata;
}

export interface SkillMatchResult {
  name: string;
  tier: number;
  score: number; // 0 for tier 1 (always), keyword match count for tier 2
}

export interface MatchContext {
  taskTitle?: string;
  taskScope?: string;
  stack?: string;
}

/**
 * Tokenize text into lowercase words for matching.
 * Removes special characters and splits on whitespace and hyphens.
 */
export function tokenize(text: string): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ") // keep hyphens for now
    .replace(/-/g, " ") // convert hyphens to spaces
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

/**
 * Compute match score between skill keywords and task tokens.
 * Returns count of keyword matches.
 */
export function computeScore(keywords: string[], tokens: string[]): number {
  if (!keywords || keywords.length === 0) return 0;
  if (!tokens || tokens.length === 0) return 0;

  const tokenSet = new Set(tokens);
  return keywords.filter((k) => tokenSet.has(k)).length;
}

/**
 * Match skills against task context.
 * Returns ranked list of relevant skills.
 *
 * Algorithm:
 * 1. Always include tier 1 skills (score = 0)
 * 2. For tier 2: compute keyword score, include if score > 0
 * 3. Exclude tier 3 skills
 * 4. Sort: tier 1 first, then tier 2 by score descending
 * 5. Apply max limit (configurable)
 */
export function matchSkills(
  skills: SkillWithMetadata[],
  context: MatchContext,
  maxResults: number = 8
): SkillMatchResult[] {
  const results: SkillMatchResult[] = [];

  // Tokenize context
  const tokens = [
    ...(context.taskTitle ? tokenize(context.taskTitle) : []),
    ...(context.taskScope ? tokenize(context.taskScope) : []),
    ...(context.stack ? tokenize(context.stack) : []),
  ];

  // Process each skill
  for (const skill of skills) {
    const tier = skill.metadata?.tier ?? 2;
    const keywords = skill.metadata?.keywords ?? [];

    if (tier === 1) {
      // Tier 1: always include with score 0
      results.push({
        name: skill.name,
        tier: 1,
        score: 0,
      });
    } else if (tier === 2) {
      // Tier 2: include only if keywords match
      const score = computeScore(keywords, tokens);
      if (score > 0) {
        results.push({
          name: skill.name,
          tier: 2,
          score,
        });
      }
    }
    // Tier 3: skip (never auto-suggest)
  }

  // Sort: tier 1 first (by name), then tier 2 by score descending
  results.sort((a, b) => {
    if (a.tier !== b.tier) {
      return a.tier - b.tier; // tier 1 first
    }
    if (a.tier === 2) {
      return b.score - a.score; // tier 2 by score descending
    }
    return a.name.localeCompare(b.name); // tier 1 by name
  });

  // Apply max limit
  return results.slice(0, maxResults);
}

/**
 * Get tier 1 skills only (for session_start).
 */
export function getTier1Skills(skills: SkillWithMetadata[]): SkillMatchResult[] {
  return skills
    .filter((s) => (s.metadata?.tier ?? 2) === 1)
    .map((s) => ({
      name: s.name,
      tier: 1,
      score: 0,
    }));
}

/**
 * Configuration for skill matching.
 */
export const SKILL_MATCHER_CONFIG = {
  MAX_TIER1_SKILLS: 4,
  MAX_TIER2_SKILLS: 4,
  MIN_KEYWORD_SCORE: 1,
  MAX_TOTAL_SUGGESTIONS: 8,
};
