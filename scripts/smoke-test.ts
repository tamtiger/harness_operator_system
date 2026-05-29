/**
 * Smoke test: spawn MCP server, use MCP client SDK to verify tools work.
 * Exit 0 if pass, 1 if fail.
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { resolve } from "node:path";
import { rmSync } from "node:fs";

const SERVER_PATH = resolve("dist/index.js");
const TEST_HOME = resolve(".harness-test-tmp");

async function main() {
  console.log("Starting MCP smoke test...\n");

  const transport = new StdioClientTransport({
    command: "node",
    args: [SERVER_PATH],
    env: { ...process.env, HARNESS_HOME: TEST_HOME } as Record<string, string>,
  });

  const client = new Client({ name: "smoke-test", version: "1.2.0" });

  try {
    await client.connect(transport);
    console.log("✓ Connected to MCP server");

    // List tools
    const toolsResult = await client.listTools();
    const toolNames = toolsResult.tools.map((t) => t.name);
    console.log(`✓ tools/list — ${toolNames.length} tools registered`);

    const expected = [
      "session_start",
      "session_end",
      "session_resume",
      "session_handoff",
      "task_create",
      "task_update",
      "task_list",
      "verify_run",
      "skill_load",
      "skill_list",
      "skill_create_from_session",
      "instinct_add",
      "instinct_get",
      "instinct_prune",
      "instinct_evolve",
      "instinct_promote",
      "progress_log",
      "feature_list_read",
      "feature_list_update",
      "handoff_write",
      "handoff_read",
      "scope_get",
      "scope_check",
      "audit_log",
      "harness_status",
      "repo_summary_read",
    ];

    for (const name of expected) {
      if (!toolNames.includes(name)) {
        throw new Error(`Missing tool: ${name}`);
      }
    }
    console.log("✓ All expected tools present");

    // Call session_start
    const sessionResult = await client.callTool({
      name: "session_start",
      arguments: { repo_path: "." },
    });
    const sessionContent = sessionResult.content as Array<{ type: string; text: string }>;
    const sessionData = JSON.parse(sessionContent[0].text);

    if (!sessionData.session_id) {
      throw new Error("session_start missing session_id");
    }
    if (!Array.isArray(sessionData.applicable_skills)) {
      throw new Error("session_start missing applicable_skills");
    }
    console.log(`✓ session_start — session_id: ${sessionData.session_id} (${sessionData.applicable_skills.length} skills)`);

    // Call task_create
    const taskResult = await client.callTool({
      name: "task_create",
      arguments: { title: "smoke test task", scope: "test" },
    });
    const taskContent = taskResult.content as Array<{ type: string; text: string }>;
    const taskData = JSON.parse(taskContent[0].text);

    if (!taskData.task_id) {
      throw new Error("task_create missing task_id");
    }
    console.log(`✓ task_create — task_id: ${taskData.task_id}`);

    // Call skill_load
    const skillResult = await client.callTool({
      name: "skill_load",
      arguments: { name: "karpathy-guidelines" },
    });
    const skillContent = skillResult.content as Array<{ type: string; text: string }>;
    const skillData = JSON.parse(skillContent[0].text);

    if (!skillData.content || skillData.error) {
      throw new Error(`skill_load failed: ${skillData.error || "no content"}`);
    }
    console.log(`✓ skill_load — loaded karpathy-guidelines (${skillData.content.length} chars)`);

    // Call instinct_add + instinct_get
    const addResult = await client.callTool({
      name: "instinct_add",
      arguments: { description: "Always run tests before commit", tags: ["testing", "git"] },
    });
    const addContent = addResult.content as Array<{ type: string; text: string }>;
    const addData = JSON.parse(addContent[0].text);

    if (!addData.id) {
      throw new Error("instinct_add missing id");
    }
    console.log(`✓ instinct_add — id: ${addData.id}`);

    const getResult = await client.callTool({
      name: "instinct_get",
      arguments: { tags: ["testing"] },
    });
    const getContent = getResult.content as Array<{ type: string; text: string }>;
    const getData = JSON.parse(getContent[0].text);

    if (!getData.instincts || getData.instincts.length === 0) {
      throw new Error("instinct_get returned no instincts");
    }
    console.log(`✓ instinct_get — found ${getData.instincts.length} instinct(s)`);

    // Call session_end
    await client.callTool({
      name: "session_end",
      arguments: { session_id: sessionData.session_id },
    });
    console.log("✓ session_end — session closed");

    // Call skill_list
    const skillListResult = await client.callTool({
      name: "skill_list",
      arguments: {},
    });
    const skillListContent = skillListResult.content as Array<{ type: string; text: string }>;
    const skillListData = JSON.parse(skillListContent[0].text);
    if (!skillListData.skills || skillListData.skills.length < 29) {
      throw new Error(`skill_list expected ≥29 skills, got ${skillListData.skills?.length}`);
    }
    console.log(`✓ skill_list — ${skillListData.skills.length} skills found`);

    // Call session_handoff (start new session first)
    const session2 = await client.callTool({
      name: "session_start",
      arguments: { repo_path: "." },
    });
    const session2Content = session2.content as Array<{ type: string; text: string }>;
    const session2Data = JSON.parse(session2Content[0].text);

    const handoffResult = await client.callTool({
      name: "session_handoff",
      arguments: {
        session_id: session2Data.session_id,
        summary: "Smoke test completed",
        unfinished: ["nothing"],
        next_steps: ["run more tests"],
      },
    });
    const handoffContent = handoffResult.content as Array<{ type: string; text: string }>;
    const handoffData = JSON.parse(handoffContent[0].text);
    if (!handoffData.handoff_path) {
      throw new Error("session_handoff missing handoff_path");
    }
    console.log("✓ session_handoff — handoff written");

    // Verify next session_start sees the handoff
    const session3 = await client.callTool({
      name: "session_start",
      arguments: { repo_path: "." },
    });
    const session3Content = session3.content as Array<{ type: string; text: string }>;
    const session3Data = JSON.parse(session3Content[0].text);
    if (!session3Data.last_handoff) {
      throw new Error("session_start did not return last_handoff after handoff was written");
    }
    console.log("✓ session_start sees previous handoff");

    // Close last session
    await client.callTool({
      name: "session_end",
      arguments: { session_id: session3Data.session_id },
    });

    // Test scope_check
    const scopeResult = await client.callTool({
      name: "scope_check",
      arguments: { repo_path: ".", file_path: "src/index.ts" },
    });
    const scopeContent = scopeResult.content as Array<{ type: string; text: string }>;
    const scopeData = JSON.parse(scopeContent[0].text);
    if (typeof scopeData.in_scope !== "boolean") {
      throw new Error("scope_check missing in_scope");
    }
    console.log(`✓ scope_check — in_scope: ${scopeData.in_scope}`);

    // Test verify_run with new params (changed_only + step_results)
    const verifyResult = await client.callTool({
      name: "verify_run",
      arguments: { repo_path: ".", fail_fast: false, changed_only: true },
    });
    const verifyContent = verifyResult.content as Array<{ type: string; text: string }>;
    const verifyData = JSON.parse(verifyContent[0].text);
    if (!Array.isArray(verifyData.step_results)) {
      throw new Error("verify_run missing step_results array");
    }
    console.log(`✓ verify_run (enhanced) — step_results: ${verifyData.step_results.length} steps, passed: ${verifyData.passed}`);

    // Test session_handoff with verify_status
    const session4 = await client.callTool({
      name: "session_start",
      arguments: { repo_path: "." },
    });
    const session4Content = session4.content as Array<{ type: string; text: string }>;
    const session4Data = JSON.parse(session4Content[0].text);

    const handoff2Result = await client.callTool({
      name: "session_handoff",
      arguments: {
        session_id: session4Data.session_id,
        summary: "Smoke test with verify_status",
        unfinished: [],
        next_steps: ["verify duration_seconds"],
        verify_status: { passed: true, steps_run: ["build", "test"] },
      },
    });
    const handoff2Content = handoff2Result.content as Array<{ type: string; text: string }>;
    const handoff2Data = JSON.parse(handoff2Content[0].text);
    if (typeof handoff2Data.duration_seconds !== "number") {
      throw new Error("session_handoff missing duration_seconds");
    }
    console.log(`✓ session_handoff (enhanced) — duration_seconds: ${handoff2Data.duration_seconds}`);

    // Test harness_status
    const statusResult = await client.callTool({
      name: "harness_status",
      arguments: {},
    });
    const statusContent = statusResult.content as Array<{ type: string; text: string }>;
    const statusData = JSON.parse(statusContent[0].text);
    if (!Array.isArray(statusData.recent_instincts)) {
      throw new Error("harness_status missing recent_instincts");
    }
    console.log(`✓ harness_status — pending_tasks: ${statusData.pending_tasks}`);

    console.log("\n✅ SMOKE TEST PASSED");
  } finally {
    await client.close();
    // Cleanup test DB
    try {
      rmSync(TEST_HOME, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  }
}

main().catch((err) => {
  console.error("\n❌ SMOKE TEST FAILED:", err.message || err);
  try {
    rmSync(TEST_HOME, { recursive: true, force: true });
  } catch {
    // ignore
  }
  process.exit(1);
});
