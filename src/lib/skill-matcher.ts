import natural from "natural";
const { TfIdf } = natural;

/**
 * Skill matching engine for tiered keyword-based skill suggestions.
 * Supports tier-based filtering and keyword matching for contextual skill recommendations.
 */

export interface SkillMetadata {
  tier?: number;
  keywords?: string[];
  dimensions?: string[];
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
  taskType?: string;
}

const TASK_TYPE_DIMENSIONS: Record<string, string[]> = {
  "feature": ["verification", "tool-usage"],
  "bugfix": ["verification"],
  "refactor": ["safety", "tool-usage"],
  "test": ["verification"],
  "docs": ["memory"],
  "config": ["safety"],
  "research": ["memory"],
  "debug": ["memory", "tool-usage"],
  "hotfix": ["safety", "verification"]
};

function inferTaskType(title?: string): string {
  if (!title) return "feature";
  const t = title.toLowerCase();
  if (t.includes("fix") || t.includes("bug") || t.includes("issue") || t.includes("error")) return "bugfix";
  if (t.includes("refactor") || t.includes("clean") || t.includes("restructure")) return "refactor";
  if (t.includes("test")) return "test";
  if (t.includes("doc") || t.includes("readme")) return "docs";
  if (t.includes("config") || t.includes("setting")) return "config";
  if (t.includes("research") || t.includes("explore")) return "research";
  if (t.includes("debug")) return "debug";
  if (t.includes("hotfix")) return "hotfix";
  return "feature";
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
  "chãy": ["run", "running", "chay", "execute"],
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
 * Match skills against task context using TF-IDF Cosine Similarity.
 * Returns ranked list of relevant skills.
 */
export function matchSkills(
  skills: SkillWithMetadata[],
  context: MatchContext,
  maxResults: number = 8
): SkillMatchResult[] {
  const results: SkillMatchResult[] = [];

  const taskType = context.taskType || inferTaskType(context.taskTitle);
  const taskDimensions = TASK_TYPE_DIMENSIONS[taskType] || [];

  // Build TF-IDF model
  const tfidf = new TfIdf();
  
  // Format each skill text for TF-IDF corpus
  const skillTexts = skills.map((skill) => {
    const rawTokens = [
      skill.name,
      skill.description ?? "",
      ...(skill.metadata?.keywords ?? []),
    ];
    // Expand tokens with synonyms to align with vocabulary
    const tokens = expandTokens(rawTokens.flatMap(tokenize));
    return tokens.join(" ");
  });

  for (const doc of skillTexts) {
    tfidf.addDocument(doc);
  }

  // Add the query text as the last document
  const rawQueryTokens = [
    ...(context.taskTitle ? tokenize(context.taskTitle) : []),
    ...(context.taskScope ? tokenize(context.taskScope) : []),
    ...(context.stack ? tokenize(context.stack) : []),
  ];
  const queryTokens = expandTokens(rawQueryTokens);
  const queryText = queryTokens.join(" ");
  tfidf.addDocument(queryText);

  const queryIndex = skills.length;

  // Process each skill
  for (let i = 0; i < skills.length; i++) {
    const skill = skills[i];
    const tier = skill.metadata?.tier ?? 2;
    const skillDimensions = skill.metadata?.dimensions || [];
    const hasOverlap = skillDimensions.some(d => taskDimensions.includes(d));
    const dimensionScore = hasOverlap ? 1.0 : 0.0;

    if (tier === 1) {
      // Tier 1: always include with score 0
      results.push({
        name: skill.name,
        tier: 1,
        score: 0,
      });
    } else {
      // Compute Cosine Similarity between skill i and query
      const terms = new Set<string>();
      tfidf.listTerms(i).forEach((item) => terms.add(item.term));
      tfidf.listTerms(queryIndex).forEach((item) => terms.add(item.term));

      let dotProduct = 0;
      let normSkill = 0;
      let normQuery = 0;

      for (const term of terms) {
        const valSkill = tfidf.tfidf(term, i);
        const valQuery = tfidf.tfidf(term, queryIndex);
        dotProduct += valSkill * valQuery;
        normSkill += valSkill * valSkill;
        normQuery += valQuery * valQuery;
      }

      const semSim = (normSkill === 0 || normQuery === 0) ? 0 : dotProduct / (Math.sqrt(normSkill) * Math.sqrt(normQuery));
      
      // Calculate keyword total using a combination of exact keyword match and semantic similarity
      const tokens = expandTokens(rawQueryTokens);
      const kwScore = computeScore(skill.metadata?.keywords ?? [], tokens);
      const descScore = descriptionScore(skill.description ?? "", tokens);
      const nmScore = nameScore(skill.name, tokens);
      const keywordTotal = kwScore + descScore + nmScore + semSim * 1.5;

      if (tier === 2) {
        const totalScore = (keywordTotal * 0.6) + (dimensionScore * 0.4);
        if (totalScore > 0) {
          results.push({
            name: skill.name,
            tier: 2,
            score: parseFloat(totalScore.toFixed(4)),
          });
        }
      } else if (tier === 3) {
        // Tier 3: on-demand skills — only suggest if strong keyword match
        if (keywordTotal >= 2.0) {
          const totalScore = (keywordTotal * 0.6) + (dimensionScore * 0.4);
          results.push({
            name: skill.name,
            tier: 3,
            score: parseFloat(totalScore.toFixed(4)),
          });
        }
      }
    }
  }

  // Sort: tier 1 first (by name), then tier 2 & 3 by score descending
  results.sort((a, b) => {
    if (a.tier !== b.tier) {
      return a.tier - b.tier; // tier 1 -> tier 2 -> tier 3
    }
    if (a.tier >= 2) {
      return b.score - a.score; // tier 2 & 3 by score descending
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

