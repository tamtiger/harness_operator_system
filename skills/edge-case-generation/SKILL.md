---
name: edge-case-generation
description: "Systematic boundary, failure, and adversarial input generation for comprehensive test coverage."
metadata:
  version: "1.0"
  updated: "2026-05-29"
  applies_to: ["*"]
  triggers: ["task_create"]
  tier: 2
  keywords: ["edge-case", "boundary", "adversarial", "fuzz", "negative", "overflow", "trường hợp biên", "ranh giới", "đối kháng", "âm", "tràn"]
---

# Edge Case Generation Skill

## Overview

Edge cases are inputs that expose bugs. This skill teaches systematic generation of boundary conditions, failure scenarios, and adversarial inputs to catch defects before production.

Most bugs live in edge cases, not happy paths. A function that works for `[1, 2, 3]` might crash on `[]`, `null`, or `[999999999]`.

## Three Categories of Edge Cases

### 1. Boundary Cases

Inputs at the limits of valid ranges.

**Numeric boundaries:**
- Zero: `0`, `-0`, `0.0`
- Extremes: `MIN_INT`, `MAX_INT`, `MIN_FLOAT`, `MAX_FLOAT`
- Off-by-one: `n-1`, `n`, `n+1` for array length `n`
- Negative: `-1`, `-999`

**String boundaries:**
- Empty: `""`, `null`, `undefined`
- Single character: `"a"`
- Very long: `"x" * 1000000`
- Special characters: `"\n"`, `"\0"`, `"\t"`, `"🔥"`
- Unicode: emoji, RTL text, combining characters

**Collection boundaries:**
- Empty: `[]`, `{}`, `new Set()`
- Single element: `[1]`, `{a: 1}`
- Duplicates: `[1, 1, 1]`
- Nested: `[[[]]]`, `{a: {b: {c: 1}}}`

**Time boundaries:**
- Epoch: `1970-01-01T00:00:00Z`
- Year 2038 problem: `2038-01-19T03:14:07Z`
- Leap seconds, daylight saving transitions

### 2. Failure Cases

Inputs that trigger error conditions.

**Type mismatches:**
- Wrong type: `"string"` where number expected
- Null/undefined: `null`, `undefined`
- Type coercion: `"123"` vs `123`

**Resource exhaustion:**
- Out of memory: very large arrays
- Stack overflow: deep recursion
- Timeout: slow operations

**Invalid state:**
- Closed connection, expired token, deleted resource
- Concurrent modifications (race conditions)
- Circular references: `a.b = a`

**External failures:**
- Network timeout, 500 error, malformed response
- Database connection lost
- File not found, permission denied

### 3. Adversarial Inputs

Inputs designed to exploit vulnerabilities.

**Injection attacks:**
- SQL: `"'; DROP TABLE users; --"`
- Command: `"; rm -rf /"`
- Template: `"{{ 7 * 7 }}"`
- XSS: `"<script>alert('xss')</script>"`

**Encoding attacks:**
- Double encoding: `%252e%252e%252f`
- Unicode normalization: `café` vs `cafe\u0301`
- Null bytes: `"file.txt\0.jpg"`

**Logic attacks:**
- Negative quantities: `-100` items
- Privilege escalation: user ID `1` (admin)
- Timing attacks: measure response time to infer secrets
- Zip bombs: compressed file expands to terabytes

## Systematic Generation Process

### Step 1: Identify Input Dimensions

For a function, list all inputs and their types:

```typescript
function transfer(from: Account, to: Account, amount: number): Result {
  // Inputs: from (Account), to (Account), amount (number)
}
```

### Step 2: Generate Boundary Cases

For each input, generate boundary values:

```typescript
// from: Account
const fromCases = [
  null,                    // null
  undefined,               // undefined
  { id: 0, balance: 0 },   // zero balance
  { id: 1, balance: -100 }, // negative balance
  { id: MAX_INT, balance: MAX_FLOAT }, // extreme values
];

// to: Account
const toCases = [
  null,
  undefined,
  { id: 0, balance: 0 },
  { id: 1, balance: MAX_FLOAT },
];

// amount: number
const amountCases = [
  0,           // zero
  -1,          // negative
  0.1,         // fractional
  MAX_FLOAT,   // extreme
  Infinity,    // infinity
  NaN,         // not a number
];
```

### Step 3: Generate Failure Cases

For each input, generate failure scenarios:

```typescript
// from: Account
const fromFailures = [
  { id: 1, balance: 0 },        // insufficient funds
  { id: 1, balance: 50, frozen: true }, // account frozen
  { id: 1, balance: 50, deleted: true }, // account deleted
];

// to: Account
const toFailures = [
  { id: 1, balance: 0, deleted: true }, // destination deleted
  { id: 1, balance: 0, frozen: true },  // destination frozen
];
```

### Step 4: Generate Adversarial Cases

For each input, generate adversarial scenarios:

```typescript
// amount: number
const adversarialCases = [
  -999999,     // negative transfer (theft)
  1e308,       // overflow attempt
  0.0000001,   // precision attack
];

// from/to: Account
const adversarialCases = [
  { id: 1, balance: 50 }, // transfer to self
  { id: 0, balance: 0 },  // transfer to admin account
];
```

### Step 5: Combine and Test

Create a test matrix combining cases:

```typescript
describe("transfer", () => {
  for (const from of fromCases) {
    for (const to of toCases) {
      for (const amount of amountCases) {
        it(`transfers ${amount} from ${from?.id} to ${to?.id}`, () => {
          const result = transfer(from, to, amount);
          // Assert expected behavior
        });
      }
    }
  }
});
```

This creates a comprehensive test suite covering all combinations.

## Checklist for Edge Case Coverage

- [ ] Boundary cases for all numeric inputs (zero, negative, extreme, off-by-one)
- [ ] Boundary cases for all string inputs (empty, single char, very long, special chars)
- [ ] Boundary cases for all collections (empty, single element, duplicates, nested)
- [ ] Null and undefined for all optional inputs
- [ ] Type mismatches (string where number expected, etc.)
- [ ] Resource exhaustion (very large inputs, deep nesting)
- [ ] Invalid state (closed connections, expired tokens, deleted resources)
- [ ] Concurrent modifications (race conditions)
- [ ] External failures (network timeout, 500 error, malformed response)
- [ ] Injection attacks (SQL, command, template, XSS)
- [ ] Encoding attacks (double encoding, null bytes, Unicode normalization)
- [ ] Logic attacks (negative quantities, privilege escalation, timing attacks)

## Property-Based Testing

For comprehensive edge case coverage, use property-based testing (fast-check, Hypothesis, QuickCheck):

```typescript
import fc from "fast-check";

describe("transfer with property-based testing", () => {
  it("should never transfer negative amounts", () => {
    fc.assert(
      fc.property(
        fc.integer(),
        fc.integer(),
        fc.integer(),
        (fromId, toId, amount) => {
          const result = transfer(
            { id: fromId, balance: 1000 },
            { id: toId, balance: 1000 },
            amount
          );
          if (amount < 0) {
            expect(result.success).toBe(false);
          }
        }
      )
    );
  });
});
```

Property-based testing generates hundreds of random inputs automatically, catching edge cases you didn't think of.

## Integration with TDD

Edge case generation is part of the planning phase in TDD:

1. **Plan**: List all behaviors, including edge cases
2. **Tracer bullet**: Test the happy path first
3. **Incremental loop**: Add one edge case test at a time
4. **Refactor**: Extract common test patterns

This ensures edge cases are tested from the start, not added as an afterthought.

