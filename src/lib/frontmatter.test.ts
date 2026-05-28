import { describe, it, expect } from "vitest";
import {
  parseFrontmatter,
  validateFrontmatter,
  SkillFrontmatter,
} from "./frontmatter.js";

describe("parseFrontmatter", () => {
  it("parses valid SKILL.md with all fields", () => {
    const input = `---
name: test-skill
version: "1.0"
updated: 2026-05-26
applies_to: ["node", "python"]
triggers: ["session_start"]
description: A test skill for unit testing.
---

# Test Skill

Some content here.
`;

    const result = parseFrontmatter(input);
    expect(result.meta).not.toBeNull();
    expect(result.meta!.name).toBe("test-skill");
    expect(result.meta!.version).toBe("1.0");
    expect(result.meta!.updated).toBe("2026-05-26");
    expect(result.meta!.applies_to).toEqual(["node", "python"]);
    expect(result.meta!.triggers).toEqual(["session_start"]);
    expect(result.meta!.description).toBe("A test skill for unit testing.");
    expect(result.content).toContain("# Test Skill");
    expect(result.content).toContain("Some content here.");
  });

  it("returns meta: null for plain markdown without frontmatter", () => {
    const input = `# Just Markdown

No frontmatter here.
`;

    const result = parseFrontmatter(input);
    expect(result.meta).toBeNull();
    expect(result.content).toBe(input);
  });

  it("returns meta: null for incomplete frontmatter (no closing ---)", () => {
    const input = `---
name: broken
This never closes
`;

    const result = parseFrontmatter(input);
    expect(result.meta).toBeNull();
    expect(result.content).toBe(input);
  });

  it("handles wildcard applies_to", () => {
    const input = `---
name: universal
applies_to: ["*"]
---

Content.
`;

    const result = parseFrontmatter(input);
    expect(result.meta!.applies_to).toEqual(["*"]);
  });

  it("handles empty values as null", () => {
    const input = `---
name: minimal
version:
---

Content.
`;

    const result = parseFrontmatter(input);
    expect(result.meta!.name).toBe("minimal");
    expect(result.meta!.version).toBeNull();
  });

  it("handles quoted strings", () => {
    const input = `---
name: "quoted-name"
version: '2.0'
---

Content.
`;

    const result = parseFrontmatter(input);
    expect(result.meta!.name).toBe("quoted-name");
    expect(result.meta!.version).toBe("2.0");
  });
});

describe("validateFrontmatter", () => {
  // --- Valid name patterns ---

  it("accepts 2-char name 'ab'", () => {
    const fm: SkillFrontmatter = { name: "ab", description: "valid" };
    expect(validateFrontmatter(fm)).toEqual([]);
  });

  it("accepts typical name 'my-skill'", () => {
    const fm: SkillFrontmatter = { name: "my-skill", description: "valid" };
    expect(validateFrontmatter(fm)).toEqual([]);
  });

  it("accepts alphanumeric name 'a1b2c3'", () => {
    const fm: SkillFrontmatter = { name: "a1b2c3", description: "valid" };
    expect(validateFrontmatter(fm)).toEqual([]);
  });

  it("accepts max-length name (64 chars)", () => {
    // 'a' + 62 chars of 'b' + 'z' = 64 chars total
    const name = "a" + "b".repeat(62) + "z";
    const fm: SkillFrontmatter = { name, description: "valid" };
    expect(validateFrontmatter(fm)).toEqual([]);
  });

  it("accepts consecutive hyphens (valid per regex)", () => {
    const fm: SkillFrontmatter = { name: "a--b", description: "valid" };
    expect(validateFrontmatter(fm)).toEqual([]);
  });

  // --- Invalid name patterns ---

  it("rejects leading hyphen", () => {
    const fm: SkillFrontmatter = {
      name: "-leading-hyphen",
      description: "valid",
    };
    const errors = validateFrontmatter(fm);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain("does not match pattern");
  });

  it("rejects uppercase letters", () => {
    const fm: SkillFrontmatter = { name: "UPPERCASE", description: "valid" };
    const errors = validateFrontmatter(fm);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain("does not match pattern");
  });

  it("rejects single char name (too short)", () => {
    const fm: SkillFrontmatter = { name: "a", description: "valid" };
    const errors = validateFrontmatter(fm);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain("does not match pattern");
  });

  it("rejects trailing hyphen", () => {
    const fm: SkillFrontmatter = { name: "a-", description: "valid" };
    const errors = validateFrontmatter(fm);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain("does not match pattern");
  });

  it("rejects name with spaces", () => {
    const fm: SkillFrontmatter = { name: "my skill", description: "valid" };
    const errors = validateFrontmatter(fm);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain("does not match pattern");
  });

  // --- Name must match parent directory ---

  it("passes when name matches parentDirName", () => {
    const fm: SkillFrontmatter = { name: "my-skill", description: "valid" };
    expect(validateFrontmatter(fm, "my-skill")).toEqual([]);
  });

  it("fails when name does not match parentDirName", () => {
    const fm: SkillFrontmatter = { name: "my-skill", description: "valid" };
    const errors = validateFrontmatter(fm, "other-dir");
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain("does not match parent directory");
  });

  // --- Description length boundaries ---

  it("rejects empty description", () => {
    const fm: SkillFrontmatter = { name: "ab", description: "" };
    const errors = validateFrontmatter(fm);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes("empty"))).toBe(true);
  });

  it("accepts 1-char description", () => {
    const fm: SkillFrontmatter = { name: "ab", description: "x" };
    expect(validateFrontmatter(fm)).toEqual([]);
  });

  it("accepts 1024-char description", () => {
    const fm: SkillFrontmatter = {
      name: "ab",
      description: "x".repeat(1024),
    };
    expect(validateFrontmatter(fm)).toEqual([]);
  });

  it("rejects 1025-char description", () => {
    const fm: SkillFrontmatter = {
      name: "ab",
      description: "x".repeat(1025),
    };
    const errors = validateFrontmatter(fm);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain("exceeds 1024 characters");
  });

  // --- Compatibility length boundary ---

  it("accepts 500-char compatibility", () => {
    const fm: SkillFrontmatter = {
      name: "ab",
      description: "valid",
      compatibility: "c".repeat(500),
    };
    expect(validateFrontmatter(fm)).toEqual([]);
  });

  it("rejects 501-char compatibility", () => {
    const fm: SkillFrontmatter = {
      name: "ab",
      description: "valid",
      compatibility: "c".repeat(501),
    };
    const errors = validateFrontmatter(fm);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain("exceeds 500 characters");
  });

  // --- Metadata validation ---

  it("accepts object metadata", () => {
    const fm: SkillFrontmatter = {
      name: "ab",
      description: "valid",
      metadata: { key: "value" },
    };
    expect(validateFrontmatter(fm)).toEqual([]);
  });

  it("rejects array metadata", () => {
    const fm = {
      name: "ab",
      description: "valid",
      metadata: ["not", "an", "object"],
    } as unknown as SkillFrontmatter;
    const errors = validateFrontmatter(fm);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain("metadata must be an object");
  });

  it("rejects string metadata", () => {
    const fm = {
      name: "ab",
      description: "valid",
      metadata: "not-an-object",
    } as unknown as SkillFrontmatter;
    const errors = validateFrontmatter(fm);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain("metadata must be an object");
  });

  // --- allowed-tools validation ---

  it("accepts string allowed-tools", () => {
    const fm: SkillFrontmatter = {
      name: "ab",
      description: "valid",
      "allowed-tools": "tool1, tool2",
    };
    expect(validateFrontmatter(fm)).toEqual([]);
  });

  it("rejects number allowed-tools", () => {
    const fm = {
      name: "ab",
      description: "valid",
      "allowed-tools": 123,
    } as unknown as SkillFrontmatter;
    const errors = validateFrontmatter(fm);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain("allowed-tools must be a string");
  });

  // --- Error completeness ---

  it("returns multiple errors for multiple violations", () => {
    const fm = {
      name: "INVALID!",
      description: "",
      metadata: "bad",
      "allowed-tools": 42,
    } as unknown as SkillFrontmatter;
    const errors = validateFrontmatter(fm);
    expect(errors.length).toBeGreaterThanOrEqual(4);
  });

  it("returns empty array for fully valid frontmatter", () => {
    const fm: SkillFrontmatter = {
      name: "valid-skill",
      description: "A perfectly valid skill description.",
      compatibility: "Works with Node 20+",
      metadata: { version: "1.0" },
      "allowed-tools": "search, read",
    };
    expect(validateFrontmatter(fm)).toEqual([]);
  });
});

describe("parseFrontmatter — nested metadata", () => {
  it("parses nested metadata block with indented key-value pairs", () => {
    const input = `---
name: my-skill
description: A skill with metadata
metadata:
  applies_to: node
  version: 2.0
  author: test-user
---

# Content
`;

    const result = parseFrontmatter(input);
    expect(result.meta).not.toBeNull();
    expect(result.meta!.metadata).toBeDefined();
    const meta = result.meta!.metadata as Record<string, unknown>;
    expect(meta.applies_to).toBe("node");
    expect(meta.version).toBe(2.0);
    expect(meta.author).toBe("test-user");
  });

  it("makes nested metadata fields accessible via dot notation", () => {
    const input = `---
name: deep-meta
description: Testing deep access
metadata:
  environment: production
  priority: high
---

Body.
`;

    const result = parseFrontmatter(input);
    expect(result.meta).not.toBeNull();
    const metadata = result.meta!.metadata as Record<string, unknown>;
    expect(metadata.environment).toBe("production");
    expect(metadata.priority).toBe("high");
  });
});
