import { describe, it, expect } from "vitest";
import {
  tokenize,
  computeScore,
  matchSkills,
  getTier1Skills,
  SkillWithMetadata,
} from "./skill-matcher.js";

describe("skill-matcher", () => {
  describe("tokenize", () => {
    it("handles normal text", () => {
      const result = tokenize("Fix payment timeout bug");
      expect(result).toEqual(["fix", "payment", "timeout", "bug"]);
    });

    it("handles camelCase", () => {
      const result = tokenize("PaymentService");
      expect(result).toEqual(["paymentservice"]);
    });

    it("handles kebab-case", () => {
      const result = tokenize("user-story");
      expect(result).toEqual(["user", "story"]);
    });

    it("removes special characters", () => {
      const result = tokenize("C#/.NET (ABP)");
      expect(result).toEqual(["net", "abp"]);
    });

    it("filters single-character words", () => {
      const result = tokenize("a b c test");
      expect(result).toEqual(["test"]);
    });

    it("handles empty string", () => {
      const result = tokenize("");
      expect(result).toEqual([]);
    });

    it("handles mixed case and special chars", () => {
      const result = tokenize("Design new payment-gateway adapter");
      expect(result).toEqual([
        "design",
        "new",
        "payment",
        "gateway",
        "adapter",
      ]);
    });
  });

  describe("computeScore", () => {
    it("counts matching keywords without synonym overlap", () => {
      const keywords = ["bug", "fix", "deploy"];
      const tokens = ["fix", "payment", "timeout", "bug"];
      const score = computeScore(keywords, tokens);
      expect(score).toBe(2); // "bug" and "fix" match
    });

    it("returns 0 when no keywords match", () => {
      const keywords = ["test", "tdd"];
      const tokens = ["deploy", "release"];
      const score = computeScore(keywords, tokens);
      expect(score).toBe(0);
    });

    it("handles empty keywords", () => {
      const keywords: string[] = [];
      const tokens = ["fix", "bug"];
      const score = computeScore(keywords, tokens);
      expect(score).toBe(0);
    });

    it("handles empty tokens", () => {
      const keywords = ["bug", "fix"];
      const tokens: string[] = [];
      const score = computeScore(keywords, tokens);
      expect(score).toBe(0);
    });

    it("counts all matching keywords", () => {
      const keywords = ["bug", "fix", "deploy"];
      const tokens = ["bug", "fix", "deploy"];
      const score = computeScore(keywords, tokens);
      expect(score).toBe(3);
    });

    it("supports prefix matching", () => {
      const keywords = ["diagnos"];
      const tokens = ["diagnosis"];
      const score = computeScore(keywords, tokens);
      expect(score).toBeCloseTo(0.7, 1);
    });

    it("supports Vietnamese Unicode normalization and matching", () => {
      const tokens = tokenize("Sửa lỗi thanh toán bị sập");
      expect(tokens).toContain("sửa");
      expect(tokens).toContain("lỗi");
      expect(tokens).toContain("thanh");
      expect(tokens).toContain("toán");
      
      const keywords = ["lỗi", "sập"];
      const score = computeScore(keywords, tokens);
      expect(score).toBeGreaterThanOrEqual(2);
    });

    it("supports Vietnamese synonyms mapping to English stems", () => {
      const tokens = tokenize("sửa bug");
      const keywords = ["fix", "error"];
      const score = computeScore(keywords, tokens);
      // "sửa" -> synonym "fix", "bug" -> synonym "error" (via reverse lookup)
      expect(score).toBeGreaterThanOrEqual(2);
    });
  });

  describe("matchSkills", () => {
    const tier1Skills: SkillWithMetadata[] = [
      {
        name: "karpathy-guidelines",
        metadata: { tier: 1, keywords: [] },
      },
      {
        name: "harness-workflow",
        metadata: { tier: 1, keywords: [] },
      },
    ];

    const tier2Skills: SkillWithMetadata[] = [
      {
        name: "systematic-diagnosis",
        metadata: {
          tier: 2,
          keywords: ["bug", "fix", "error", "crash", "debug"],
        },
      },
      {
        name: "tdd-workflow",
        metadata: {
          tier: 2,
          keywords: ["test", "tdd", "red-green", "refactor"],
        },
      },
      {
        name: "design-grilling",
        metadata: {
          tier: 2,
          keywords: ["design", "architecture", "plan"],
        },
      },
    ];

    const tier3Skills: SkillWithMetadata[] = [
      {
        name: "write-a-skill",
        metadata: { tier: 3, keywords: [] },
      },
    ];

    const allSkills = [...tier1Skills, ...tier2Skills, ...tier3Skills];

    it("always includes tier 1 skills", () => {
      const results = matchSkills(allSkills, { taskTitle: "anything" });
      const tier1Results = results.filter((r) => r.tier === 1);
      expect(tier1Results).toHaveLength(2);
      expect(tier1Results.map((r) => r.name)).toContain("karpathy-guidelines");
      expect(tier1Results.map((r) => r.name)).toContain("harness-workflow");
    });

    it("matches tier 3 skills only on strong keyword match (score >= 2.0)", () => {
      const customSkills = [
        ...allSkills,
        {
          name: "verification-loop",
          metadata: {
            tier: 3,
            keywords: ["lint", "ci", "security_audit"],
          },
        },
      ];
      // Test 1: title has "lint ci security" -> strong match
      const results1 = matchSkills(customSkills, { taskTitle: "lint ci security" });
      expect(results1.map((r) => r.name)).toContain("verification-loop");

      // Test 2: title has "lint" only -> weak match, should exclude
      const results2 = matchSkills(customSkills, { taskTitle: "lint code" });
      expect(results2.map((r) => r.name)).not.toContain("verification-loop");
    });

    it("matches tier 2 skills by keywords", () => {
      const results = matchSkills(allSkills, {
        taskTitle: "Fix payment timeout bug",
      });
      const tier2Results = results.filter((r) => r.tier === 2);
      expect(tier2Results.length).toBeGreaterThan(0);
      expect(tier2Results.map((r) => r.name)).toContain("systematic-diagnosis");
    });

    it("ranks tier 2 skills by score descending", () => {
      const results = matchSkills(allSkills, {
        taskTitle: "Fix bug and refactor test",
      });
      const tier2Results = results.filter((r) => r.tier === 2);
      // systematic-diagnosis should have higher score than tdd-workflow
      if (tier2Results.length >= 2) {
        const diagIndex = tier2Results.findIndex(
          (r) => r.name === "systematic-diagnosis"
        );
        const tddIndex = tier2Results.findIndex((r) => r.name === "tdd-workflow");
        if (diagIndex >= 0 && tddIndex >= 0) {
          expect(diagIndex).toBeLessThan(tddIndex);
        }
      }
    });

    it("respects maxResults limit", () => {
      const results = matchSkills(allSkills, { taskTitle: "anything" }, 2);
      expect(results).toHaveLength(2);
    });

    it("handles empty context", () => {
      const results = matchSkills(allSkills, {});
      // Should still return tier 1 skills
      expect(results.length).toBeGreaterThan(0);
      expect(results.filter((r) => r.tier === 1)).toHaveLength(2);
    });

    it("handles skills without metadata", () => {
      const skillsWithoutMeta: SkillWithMetadata[] = [
        { name: "skill-without-meta" },
        ...tier1Skills,
      ];
      const results = matchSkills(skillsWithoutMeta, {
        taskTitle: "anything",
      });
      // skill-without-meta defaults to tier 2, no keywords, so no match
      expect(results.map((r) => r.name)).not.toContain("skill-without-meta");
    });

    it("handles design task", () => {
      const results = matchSkills(allSkills, {
        taskTitle: "Design new payment gateway adapter",
      });
      const tier2Results = results.filter((r) => r.tier === 2);
      expect(tier2Results.map((r) => r.name)).toContain("design-grilling");
    });

    it("handles test task", () => {
      const results = matchSkills(allSkills, {
        taskTitle: "Write test for payment service",
      });
      const tier2Results = results.filter((r) => r.tier === 2);
      // "test" keyword should match tdd-workflow
      expect(tier2Results.map((r) => r.name)).toContain("tdd-workflow");
    });
  });

  describe("getTier1Skills", () => {
    it("returns only tier 1 skills", () => {
      const skills: SkillWithMetadata[] = [
        { name: "tier1-a", metadata: { tier: 1 } },
        { name: "tier1-b", metadata: { tier: 1 } },
        { name: "tier2-a", metadata: { tier: 2 } },
        { name: "tier3-a", metadata: { tier: 3 } },
      ];
      const results = getTier1Skills(skills);
      expect(results).toHaveLength(2);
      expect(results.map((r) => r.name)).toEqual(["tier1-a", "tier1-b"]);
      expect(results.every((r) => r.tier === 1)).toBe(true);
      expect(results.every((r) => r.score === 0)).toBe(true);
    });

    it("handles empty skills", () => {
      const results = getTier1Skills([]);
      expect(results).toHaveLength(0);
    });

    it("handles skills without tier metadata", () => {
      const skills: SkillWithMetadata[] = [
        { name: "no-tier" }, // defaults to tier 2
        { name: "tier1", metadata: { tier: 1 } },
      ];
      const results = getTier1Skills(skills);
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("tier1");
    });
  });
});
