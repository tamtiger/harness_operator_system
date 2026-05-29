---
name: zoom-out
description: "Tell the agent to zoom out, get broader context, and check the higher-level design. Use when you are unfamiliar with a section of code or feel stuck in details."
metadata:
  version: "1.0"
  updated: "2026-05-29"
  applies_to: ["*"]
  triggers: ["session_start", "task_create"]
---

# Zoom Out for Broader Context

When you feel stuck, find yourself making repeated unsuccessful edits, or are working in an unfamiliar area of the codebase, you must **zoom out** rather than continuing to write code blindly.

## Guidelines

1. **Stop Coding:** Immediately halt code modifications. Do not attempt to fix errors by guessing.
2. **Review High-Level Structure:** 
   - Check the repo summary using `repo_summary_read(".")` to understand the directory tree and module boundaries.
   - Look for architectural documentation or design patterns in `docs/` or `rulebooks/`.
3. **Map Dependencies:** Analyze which modules depend on the code you are modifying. Trace data inputs and outputs up to the API or down to the database.
4. **Identify the Core Concepts:** Read adjacent files or types to understand the design conventions and naming patterns.
5. **Formulate a Summary:** Write a brief summary of how you think the system works, and ask the user to confirm or correct your understanding before resuming work.

## Anti-Patterns

- **Tunnel Vision:** Making micro-fixes to a single file without knowing who calls it or what it outputs.
- **Ignoring Existing Patterns:** Writing custom helper classes or logic that duplicates existing patterns in the codebase.
- **Silent Guessing:** Trying to solve a structural layout or logic flow by random trial-and-error without discussing with the user.
