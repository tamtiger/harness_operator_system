import { describe, it, expect, vi } from "vitest";
import { codeSearchGrep, codeSearchSymbols } from "./code_search.js";
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

describe("Codebase Search Utilities", () => {
  it("performs grep search successfully", () => {
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
  });

  it("finds symbols correctly", () => {
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
  });
});
