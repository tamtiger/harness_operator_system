import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { resolve, join, dirname } from "node:path";
import { rmSync, writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SERVER_PATH = resolve("dist/index.js");
const TEST_HOME = resolve(".harness-workflow-verify-tmp");

const thisFile = fileURLToPath(import.meta.url);
const projectRoot = resolve(dirname(thisFile), "..");
const packageJson = JSON.parse(readFileSync(join(projectRoot, "package.json"), "utf-8"));

async function main() {
  console.log("=== STARTING FULL WORKFLOW SIMULATION SYSTEM ===");
  console.log("This tool verifies the gating, sequence, and compliance systems after code updates.\n");

  // 1. Prepare isolated workspace
  try {
    rmSync(TEST_HOME, { recursive: true, force: true });
  } catch {}
  mkdirSync(TEST_HOME, { recursive: true });
  
  // Create local skills directory and write test skill
  const localSkillsDir = join(TEST_HOME, ".harness", "skills", "test-skill");
  mkdirSync(localSkillsDir, { recursive: true });

  const skillContent = `---
name: test-skill
description: "Integration verification skill for narrative gating and sequence checks"
metadata:
  version: "1.0"
  updated: "2026-06-21"
  applies_to: ["*"]
  tier: 3
steps:
  - id: check_scope
    type: action_mappable
    required_tool: scope_check
    order: before(verify_run)
  - id: write_cause
    type: narrative_gated
    required_tool: skill_narrative_submit
    gate_field: root_cause
    blocks: verify_run
compliance_weight: 15
---

# Test Skill
Body content for verification test.
`;
  writeFileSync(join(localSkillsDir, "SKILL.md"), skillContent, "utf-8");
  console.log("✓ Created isolated workspace and test skill configuration");

  // 2. Start MCP server and client
  const transport = new StdioClientTransport({
    command: "node",
    args: [SERVER_PATH],
    env: { ...process.env, HARNESS_HOME: TEST_HOME } as Record<string, string>,
  });

  const client = new Client({ name: "workflow-verify-tool", version: packageJson.version });

  try {
    await client.connect(transport);
    console.log("✓ Successfully connected to MCP server");

    // 3. session_start
    const sessionRes = await client.callTool({
      name: "session_start",
      arguments: { repo_path: TEST_HOME },
    });
    const sessionData = JSON.parse((sessionRes.content as any)[0].text);
    const sessionId = sessionData.session_id;
    console.log(`✓ Started session: ${sessionId}`);

    // 4. task_create
    const taskRes = await client.callTool({
      name: "task_create",
      arguments: { title: "Verify System Integration", scope: "test" },
    });
    const taskData = JSON.parse((taskRes.content as any)[0].text);
    console.log(`✓ Created task: ${taskData.task_id}`);

    // 5. skill_load
    const skillRes = await client.callTool({
      name: "skill_load",
      arguments: { name: "test-skill", repo_path: TEST_HOME },
    });
    console.log("✓ Loaded test-skill from workspace");

    // 6. Verify blocking mechanism
    console.log("Testing narrative gate blocking...");
    const blockedVerify = await client.callTool({
      name: "verify_run",
      arguments: { repo_path: TEST_HOME, changed_only: true },
    });
    const verifyBlockedData = JSON.parse((blockedVerify.content as any)[0].text);

    if (verifyBlockedData.error && verifyBlockedData.error.includes("blocked by skill")) {
      console.log(`✓ Gating block works. Blocked with message: "${verifyBlockedData.error}"`);
    } else {
      throw new Error(`Gating failed: verify_run was not blocked! Result: ${JSON.stringify(verifyBlockedData)}`);
    }

    // 7. Verify order check (scope_check must be run before verify_run)
    await client.callTool({
      name: "scope_check",
      arguments: { repo_path: TEST_HOME, file_path: "package.json" },
    });
    console.log("✓ Ran scope_check (satisfying order constraint)");

    // 8. Submit narrative to satisfy gating
    console.log("Submitting narrative gate info...");
    const submitRes = await client.callTool({
      name: "skill_narrative_submit",
      arguments: {
        session_id: sessionId,
        skill: "test-skill",
        field: "root_cause",
        text: "Root cause found: verified that the gating mechanism blocks correctly.",
      },
    });
    const submitData = JSON.parse((submitRes.content as any)[0].text);
    if (!submitData.ok) {
      throw new Error(`Narrative submission failed: ${submitData.error}`);
    }
    console.log("✓ Narrative gate satisfied successfully");

    // 9. Verify allowed execution
    console.log("Executing verify_run again...");
    const allowedVerify = await client.callTool({
      name: "verify_run",
      arguments: { repo_path: TEST_HOME, changed_only: true },
    });
    const allowedData = JSON.parse((allowedVerify.content as any)[0].text);
    if (allowedData.error) {
      throw new Error(`Allowed execution failed: verify_run is still blocked: ${allowedData.error}`);
    }
    console.log("✓ verify_run executed successfully without blocks");

    // 10. Log progress
    await client.callTool({
      name: "progress_log",
      arguments: {
        session_id: sessionId,
        summary: "Full round simulated: Gating and sequencing pass all criteria.",
        status: "in-progress",
      },
    });
    console.log("✓ Progress logged");

    // 11. Run session_handoff
    console.log("Executing session handoff...");
    const handoffRes = await client.callTool({
      name: "session_handoff",
      arguments: {
        session_id: sessionId,
        summary: "System updates verified successfully",
        unfinished: [],
        next_steps: ["No further actions needed"],
        verify_status: { passed: true, steps_run: ["build"] },
      },
    });
    const handoffData = JSON.parse((handoffRes.content as any)[0].text);
    if (handoffData.error) {
      throw new Error(`Handoff failed: ${handoffData.error}`);
    }
    console.log("✓ Session handoff executed successfully");

    // 12. Final compliance status check
    const complianceRes = await client.callTool({
      name: "compliance_check",
      arguments: { session_id: sessionId },
    });
    const complianceData = JSON.parse((complianceRes.content as any)[0].text);
    console.log(`\nCompliance status: ${complianceData.status}, Score: ${complianceData.score}/100`);

    if (complianceData.status !== "PASS") {
      throw new Error(`Final compliance status is not PASS: ${JSON.stringify(complianceData)}`);
    }

    console.log("\n✅ ALL SYSTEM VERIFICATIONS PASSED SUCCESSFULLY");

  } finally {
    await client.close();
    try {
      rmSync(TEST_HOME, { recursive: true, force: true });
    } catch {}
  }
}

main().catch((err) => {
  console.error("\n❌ SYSTEM VERIFICATION FAILED:", err.message || err);
  try {
    rmSync(TEST_HOME, { recursive: true, force: true });
  } catch {}
  process.exit(1);
});
