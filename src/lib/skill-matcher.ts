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
  score: number; // float score
}

export interface MatchContext {
  taskTitle?: string;
  taskScope?: string;
  stack?: string;
}

export const SYNONYMS: Record<string, string[]> = {
  // English stems / derivations
  "test": ["testing", "tests", "tested", "unittest", "unit-test", "kiem-thu"],
  "bug": ["bugs", "bugfix", "defect", "issue", "problem", "loi", "lỗi"],
  "fix": ["fixed", "fixing", "fixes", "repair", "patch", "hotfix", "sua", "sửa"],
  "design": ["designed", "designing", "designs", "architect", "thiet-ke", "thiết kế"],
  "review": ["reviewing", "reviewed", "reviews", "inspect", "danh-gia"],
  "refactor": ["refactoring", "refactored", "restructure", "cleanup", "toi-uu-code"],
  "debug": ["debugging", "debugged", "debugger", "troubleshoot"],
  "optimize": ["optimise", "optimization", "optimisation", "perf", "performance", "toi-uu", "tối ưu"],
  "deploy": ["deployment", "deploying", "release", "ship", "trien-khai"],
  "merge": ["merging", "merged", "pr", "pull-request"],
  
  // Vietnamese terms & variations
  "lỗi": ["bug", "error", "loi", "sự cố", "hỏng"],
  "sửa": ["fix", "sua", "khắc phục", "fix-bug"],
  "kiểm": ["test", "kiem", "verify", "xác minh"],
  "thiết kế": ["design", "thiet-ke", "kiến trúc"],
  "tối ưu": ["optimize", "toi-uu", "nâng cấp", "cải tiến"],
  "code": ["mã nguồn", "source-code", "coding"],
  "phân tích": ["analyze", "analysis", "phan-tich"],
  "kế hoạch": ["plan", "planning", "ke-hoach"],
  "chạy": ["run", "running", "chay", "execute"],
  "báo cáo": ["report", "reporting", "bao-cao"],
};

/**
 * Expand tokens with synonyms.
 */
export function expandTokens(tokens: string[]): string[] {
  const expanded = new Set(tokens);
  for (const token of tokens) {
    if (SYNONYMS[token]) {
      for (const syn of SYNONYMS[token]) {
        expanded.add(syn);
      }
    }
    for (const [key, values] of Object.entries(SYNONYMS)) {
      if (values.includes(token)) {
        expanded.add(key);
        for (const syn of values) {
          expanded.add(syn);
        }
      }
    }
  }
  return [...expanded];
}

/**
 * Tokenize text into lowercase words for matching.
 * Keeps Unicode letters, digits, and filters single-character words.
 */
export function tokenize(text: string): string[] {
  if (!text) return [];
  const normalized = text.normalize("NFC").toLowerCase();
  return normalized
    .replace(/[^\p{L}\p{N}\s-]/gu, " ") // Unicode-aware regex
    .replace(/-/g, " ") // convert hyphens to spaces
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

/**
 * Compute keyword match score for a single keyword against tokens.
 */
export function computeKeywordScore(keyword: string, tokenSet: Set<string>, tokens: string[]): number {
  const kwTokens = tokenize(keyword);
  if (kwTokens.length === 0) return 0;
  
  let scoreSum = 0;
  for (const kwt of kwTokens) {
    let bestMatch = 0;
    if (tokenSet.has(kwt)) {
      bestMatch = 1.0;
    } else {
      for (const token of tokens) {
        if (token.startsWith(kwt) || kwt.startsWith(token)) {
          const overlap = Math.min(kwt.length, token.length);
          const maxLen = Math.max(kwt.length, token.length);
          if (overlap >= 3 && (overlap / maxLen) >= 0.6) {
            bestMatch = Math.max(bestMatch, 0.7);
          }
        }
      }
    }
    scoreSum += bestMatch;
  }
  return scoreSum / kwTokens.length;
}

/**
 * Compute match score between skill keywords and task tokens.
 * Returns normalized score.
 */
export function computeScore(keywords: string[], tokens: string[]): number {
  if (!keywords || keywords.length === 0) return 0;
  if (!tokens || tokens.length === 0) return 0;

  const expanded = expandTokens(tokens);
  const tokenSet = new Set(expanded);
  
  let keywordTotal = 0;
  for (const kw of keywords) {
    keywordTotal += computeKeywordScore(kw, tokenSet, expanded);
  }
  return keywordTotal;
}

/**
 * Description-based match score helper.
 */
function descriptionScore(description: string, tokens: string[]): number {
  if (!description || tokens.length === 0) return 0;
  const descTokens = new Set(tokenize(description));
  let matches = 0;
  for (const token of tokens) {
    if (descTokens.has(token)) matches++;
  }
  return Math.min(matches / tokens.length, 1.0) * 0.3;
}

/**
 * Skill name-based match score helper.
 */
function nameScore(skillName: string, tokens: string[]): number {
  const nameTokens = tokenize(skillName);
  if (nameTokens.length === 0) return 0;
  const tokenSet = new Set(tokens);
  let matches = 0;
  for (const nt of nameTokens) {
    if (tokenSet.has(nt)) matches++;
  }
  return matches > 0 ? 0.5 * (matches / nameTokens.length) : 0;
}

/**
 * Match skills against task context.
 * Returns ranked list of relevant skills.
 */
export function matchSkills(
  skills: SkillWithMetadata[],
  context: MatchContext,
  maxResults: number = 8
): SkillMatchResult[] {
  const results: SkillMatchResult[] = [];

  // Tokenize context
  const rawTokens = [
    ...(context.taskTitle ? tokenize(context.taskTitle) : []),
    ...(context.taskScope ? tokenize(context.taskScope) : []),
    ...(context.stack ? tokenize(context.stack) : []),
  ];
  
  const tokens = expandTokens(rawTokens);

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
      // Tier 2: include if totalScore > 0
      const kwScore = computeScore(keywords, tokens);
      const descScore = descriptionScore(skill.description ?? "", tokens);
      const nmScore = nameScore(skill.name, tokens);
      const totalScore = kwScore + descScore + nmScore;
      
      if (totalScore > 0) {
        results.push({
          name: skill.name,
          tier: 2,
          score: parseFloat(totalScore.toFixed(4)),
        });
      }
    }
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

