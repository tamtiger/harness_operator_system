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

  const client = new Client({ name: "smoke-test", version: "1.0.0" });

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
      "task_create",
      "task_update",
      "task_list",
      "verify_run",
      "skill_load",
      "instinct_add",
      "instinct_get",
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
    console.log(`✓ session_start — session_id: ${sessionData.session_id}`);

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
