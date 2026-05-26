import { describe, it, expect } from "vitest";
import { parseFrontmatter } from "./frontmatter.js";

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
