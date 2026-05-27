import { describe, it, expect } from "vitest";
import { parseVitestJson } from "./vitest.js";
import { parseGenericOutput } from "./generic.js";

describe("parseVitestJson", () => {
  it("parses vitest JSON output", () => {
    const input = JSON.stringify({
      testResults: [
        {
          assertionResults: [
            { status: "passed", fullName: "test 1" },
            { status: "passed", fullName: "test 2" },
            { status: "failed", fullName: "test 3", failureMessages: ["Expected true"] },
          ],
        },
      ],
      startTime: Date.now() - 1000,
    });

    const result = parseVitestJson(input);
    expect(result).not.toBeNull();
    expect(result!.passed).toBe(2);
    expect(result!.failed).toBe(1);
    expect(result!.failures).toHaveLength(1);
    expect(result!.failures[0].test).toBe("test 3");
  });

  it("returns null for non-JSON input", () => {
    expect(parseVitestJson("not json")).toBeNull();
  });

  it("returns null for unrelated JSON", () => {
    expect(parseVitestJson('{"foo": "bar"}')).toBeNull();
  });
});

describe("parseGenericOutput", () => {
  it("parses 'X passed, Y failed' pattern", () => {
    const result = parseGenericOutput("Tests: 5 passed, 2 failed, 1 skipped");
    expect(result).not.toBeNull();
    expect(result!.passed).toBe(5);
    expect(result!.failed).toBe(2);
    expect(result!.skipped).toBe(1);
  });

  it("parses go test output", () => {
    const output = `ok  	mypackage	0.5s
ok  	mypackage/sub	0.3s
FAIL	mypackage/broken	0.1s`;

    const result = parseGenericOutput(output);
    expect(result).not.toBeNull();
    expect(result!.passed).toBe(2);
    expect(result!.failed).toBe(1);
  });

  it("returns null for unrecognized output", () => {
    expect(parseGenericOutput("hello world")).toBeNull();
  });
});
