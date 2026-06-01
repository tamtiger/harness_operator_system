import { describe, it, expect, vi, beforeEach } from "vitest";
import { codeSearchGrep, codeSearchSymbols } from "./code_search.js";
import { scopeGet } from "./scope.js";
import * as fs from "node:fs";

vi.mock("node:fs", async () => {
  const actual = await vi.importActual<typeof import("node:fs")>("node:fs");
  return {
    ...actual,
    readdirSync: vi.fn(),
    statSync: vi.fn(),
    readFileSync: vi.fn(),
    existsSync: vi.fn(),
  };
});

vi.mock("./scope.js", () => ({
  scopeGet: vi.fn(),
}));

describe("Codebase Search Utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("performs grep search successfully", () => {
    (scopeGet as any).mockReturnValue({
      forbidden_paths: [],
      allowed_paths: ["**"],
      definition_of_done: [],
    });

    vi.mocked(fs.readdirSync).mockReturnValue(["M24C27Model.cs"] as any);
    vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => false } as any);
    vi.mocked(fs.readFileSync).mockReturnValue(`
      public class M24C27Model {
        public void LoadData() {
          // test data
        }
      }
    `);

    const result = codeSearchGrep(".", "LoadData");
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].file).toBe("M24C27Model.cs");
    expect(result.matches[0].line).toBe(3);
    expect(result.matches[0].content).toContain("LoadData");
    expect(result.scope_applied).toBe(false);
  });

  it("finds symbols correctly", () => {
    (scopeGet as any).mockReturnValue({
      forbidden_paths: [],
      allowed_paths: ["**"],
      definition_of_done: [],
    });

    vi.mocked(fs.readdirSync).mockReturnValue(["InventoryModel.php"] as any);
    vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => false } as any);
    vi.mocked(fs.readFileSync).mockReturnValue(`
      class InventoryModel {
        function getInventory() {}
      }
    `);

    const result = codeSearchSymbols(".", "InventoryModel");
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].name).toBe("InventoryModel");
    expect(result.matches[0].type).toBe("class");
    expect(result.scope_applied).toBe(false);
  });

  it("filters out forbidden paths during grep search", () => {
    (scopeGet as any).mockReturnValue({
      forbidden_paths: ["**/forbidden/**", "secret.ts"],
      allowed_paths: ["**"],
      definition_of_done: [],
    });

    // Mock directory structure: 1 normal file, 1 forbidden folder, 1 forbidden file
    vi.mocked(fs.readdirSync).mockImplementation((dir) => {
      const dirStr = dir.toString().replace(/\\/g, "/");
      if (dirStr.endsWith("forbidden")) {
        return ["nested.ts"] as any;
      }
      return ["normal.ts", "forbidden", "secret.ts"] as any;
    });

    vi.mocked(fs.statSync).mockImplementation((path) => {
      const isDir = path.toString().replace(/\\/g, "/").endsWith("forbidden");
      return { isDirectory: () => isDir } as any;
    });

    vi.mocked(fs.readFileSync).mockReturnValue("query_term");

    const result = codeSearchGrep(".", "query_term");
    // Should match normal.ts, but skip secret.ts and forbidden folder
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].file).toBe("normal.ts");
    expect(result.scope_applied).toBe(true);
  });
});
