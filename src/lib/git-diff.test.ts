import { describe, it, expect } from "vitest";
import { parseGitDiffOutput, getChangedFiles } from "./git-diff.js";

describe("parseGitDiffOutput", () => {
  it("returns empty array for empty string", () => {
    expect(parseGitDiffOutput("")).toEqual([]);
  });

  it("returns empty array for whitespace-only input", () => {
    expect(parseGitDiffOutput("   \n  \n  ")).toEqual([]);
  });

  it("parses Unix line endings", () => {
    const output = "src/index.ts\nsrc/lib/repo.ts\nREADME.md\n";
    expect(parseGitDiffOutput(output)).toEqual([
      "src/index.ts",
      "src/lib/repo.ts",
      "README.md",
    ]);
  });

  it("handles Windows line endings (\\r\\n)", () => {
    const output = "src/index.ts\r\nsrc/lib/repo.ts\r\nREADME.md\r\n";
    expect(parseGitDiffOutput(output)).toEqual([
      "src/index.ts",
      "src/lib/repo.ts",
      "README.md",
    ]);
  });

  it("skips empty lines between entries", () => {
    const output = "src/a.ts\n\n\nsrc/b.ts\n\nsrc/c.ts\n";
    expect(parseGitDiffOutput(output)).toEqual([
      "src/a.ts",
      "src/b.ts",
      "src/c.ts",
    ]);
  });

  it("trims leading/trailing whitespace from lines", () => {
    const output = "  src/a.ts  \n  src/b.ts\n";
    expect(parseGitDiffOutput(output)).toEqual(["src/a.ts", "src/b.ts"]);
  });
});

describe("getChangedFiles", () => {
  it("returns empty array for non-existent repo path", () => {
    const result = getChangedFiles("/nonexistent/path/that/does/not/exist");
    expect(result).toEqual([]);
  });

  it("never throws on invalid input", () => {
    expect(() => getChangedFiles("")).not.toThrow();
  });
});
