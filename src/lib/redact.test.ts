import { describe, it, expect } from "vitest";
import { redactSecrets } from "./redact.js";

describe("redactSecrets", () => {
  it("redacts sensitive keys", () => {
    const input = {
      password: "mysecretpassword",
      username: "admin",
      nested: {
        accessToken: "some-jwt",
        normal: "data",
      },
    };

    const output = redactSecrets(input);

    expect(output).toEqual({
      password: "[REDACTED]",
      username: "admin",
      nested: {
        accessToken: "[REDACTED]",
        normal: "data",
      },
    });
    
    // Ensure original object is not mutated
    expect(input.password).toBe("mysecretpassword");
  });

  it("handles arrays", () => {
    const input = [
      { secret: "hidden" },
      "plain text",
      { safe: "value" }
    ];

    const output = redactSecrets(input);

    expect(output).toEqual([
      { secret: "[REDACTED]" },
      "plain text",
      { safe: "value" }
    ]);
  });

  it("handles max depth", () => {
    const input = {
      a: {
        b: {
          c: "value",
        }
      }
    };

    // maxDepth = 2:
    // call 1: input, depth 2
    // call 2: input.a, depth 1
    // call 3: input.a.b, depth 0 -> returns "[MAX_DEPTH_REACHED]"
    const output = redactSecrets(input, 2);
    expect(output.a.b).toBe("[MAX_DEPTH_REACHED]");
  });

  it("ignores non-object primitives", () => {
    expect(redactSecrets(null)).toBe(null);
    expect(redactSecrets("string")).toBe("string");
    expect(redactSecrets(123)).toBe(123);
  });
});
