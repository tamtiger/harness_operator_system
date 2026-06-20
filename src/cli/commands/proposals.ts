import { getDb } from "../../db/client.js";
import { checkRegressionGate } from "../../tools/instinct.js";
import { getFlag, hasFlag, args } from "./utils.js";
import readline from "node:readline";

function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    })
  );
}

function applyProposal(approveId: string, db: any) {
  const proposal = db.prepare(`SELECT * FROM proposals WHERE id = ?`).get(approveId) as {
    id: string;
    type: string;
    instinct_ids: string;
    rationale: string;
    suggested_change: string | null;
    status: string;
  } | undefined;

  if (!proposal) {
    console.error(`  ✗ Proposal not found: ${approveId}`);
    process.exit(1);
  }

  if (proposal.status !== "pending_review") {
    console.error(`  ✗ Proposal is already ${proposal.status}`);
    process.exit(1);
  }

  const instinctIds = JSON.parse(proposal.instinct_ids) as string[];
  const failedChecks: string[] = [];

  for (const instId of instinctIds) {
    if (proposal.type === "merge" || proposal.type === "evolve") {
      const gate = checkRegressionGate(instId);
      if (!gate.passed) {
        failedChecks.push(...gate.failed_checks.map((c: string) => `${instId}: ${c}`));
      }
    }
  }

  if (failedChecks.length > 0) {
    db.prepare(`UPDATE proposals SET status = 'rejected' WHERE id = ?`).run(approveId);
    console.error(`  ✗ Approval rejected due to failed regression gates:`);
    for (const fc of failedChecks) {
      console.error(`    - ${fc}`);
    }
    process.exit(1);
  }

  db.prepare(`UPDATE proposals SET status = 'approved' WHERE id = ?`).run(approveId);

  for (const instId of instinctIds) {
    if (proposal.type === "merge" || proposal.type === "evolve") {
      db.prepare(`UPDATE instincts SET status = 'shadow' WHERE id = ?`).run(instId);
      console.log(`  ✓ Instinct ${instId.slice(0, 8)} transitioned to shadow mode.`);
    } else if (proposal.type === "prune") {
      db.prepare(`UPDATE instincts SET status = 'pruned' WHERE id = ?`).run(instId);
      console.log(`  ✓ Instinct ${instId.slice(0, 8)} pruned.`);
    } else if (proposal.type === "penalize") {
      db.prepare(`UPDATE instincts SET confidence = MAX(0.1, confidence - 0.2) WHERE id = ?`).run(instId);
      console.log(`  ✓ Instinct ${instId.slice(0, 8)} penalized.`);
    }
  }

  console.log(`\n✓ Proposal ${approveId.slice(0, 8)} successfully approved!\n`);
}

export async function cmdProposals() {
  const db = getDb();
  const listFlag = hasFlag("list") || args.length === 1;
  const approveId = getFlag("approve") || getFlag("apply");
  const rejectId = getFlag("reject");
  const detailsId = getFlag("details");

  if (approveId) {
    applyProposal(approveId, db);
    return;
  }

  if (rejectId) {
    const proposal = db.prepare(`SELECT * FROM proposals WHERE id = ?`).get(rejectId) as {
      id: string;
      status: string;
    } | undefined;

    if (!proposal) {
      console.error(`  ✗ Proposal not found: ${rejectId}`);
      process.exit(1);
    }

    if (proposal.status !== "pending_review") {
      console.error(`  ✗ Proposal is already ${proposal.status}`);
      process.exit(1);
    }

    db.prepare(`UPDATE proposals SET status = 'rejected' WHERE id = ?`).run(rejectId);
    console.log(`\n✓ Proposal ${rejectId.slice(0, 8)} successfully rejected.\n`);
    return;
  }

  if (detailsId) {
    const proposal = db.prepare(`SELECT * FROM proposals WHERE id = ?`).get(detailsId) as {
      id: string;
      type: string;
      instinct_ids: string;
      rationale: string;
      suggested_change: string | null;
      status: string;
      created_at: string;
      evidence_summary: string | null;
    } | undefined;

    if (!proposal) {
      console.error(`  ✗ Proposal not found: ${detailsId}`);
      process.exit(1);
    }

    console.log(`\n=== Proposal Details: ${proposal.id} ===\n`);
    console.log(`  Type:       ${proposal.type}`);
    console.log(`  Status:     ${proposal.status}`);
    console.log(`  Created:    ${proposal.created_at}`);
    console.log(`  Instincts:  ${JSON.parse(proposal.instinct_ids).join(", ")}`);
    console.log(`  Rationale:  ${proposal.rationale}`);
    if (proposal.suggested_change) {
      console.log(`  Suggested Change:\n${proposal.suggested_change}`);
    }
    if (proposal.evidence_summary) {
      console.log(`\n${proposal.evidence_summary}`);
    }

    const instinctIds = JSON.parse(proposal.instinct_ids) as string[];
    const failedChecks: string[] = [];
    for (const instId of instinctIds) {
      const gate = checkRegressionGate(instId);
      if (!gate.passed) {
        failedChecks.push(...gate.failed_checks.map((c: string) => `${instId}: ${c}`));
      }
    }
    console.log(`\n  Gate Pre-check: ${failedChecks.length === 0 ? "PASSED" : "FAILED"}`);
    if (failedChecks.length > 0) {
      for (const fc of failedChecks) {
        console.log(`    - ${fc}`);
      }
    }
    console.log("");
    return;
  }

  if (listFlag) {
    const proposals = db.prepare(`SELECT * FROM proposals ORDER BY created_at DESC`).all() as Array<{
      id: string;
      type: string;
      instinct_ids: string;
      rationale: string;
      status: string;
      created_at: string;
    }>;

    console.log("\n=== AEGIS-lite Proposals ===\n");
    if (proposals.length === 0) {
      console.log("  (no proposals found)");
      return;
    }

    for (const p of proposals) {
      console.log(`  [${p.status}] ID: ${p.id.slice(0, 8)} | Type: ${p.type}`);
      const instinctIds = JSON.parse(p.instinct_ids) as string[];
      console.log(`    Instincts: ${instinctIds.map((id: string) => id.slice(0, 8)).join(", ")}`);
      console.log(`    Rationale: ${p.rationale}`);
      
      const failedChecks: string[] = [];
      for (const instId of instinctIds) {
        const gate = checkRegressionGate(instId);
        if (!gate.passed) {
          failedChecks.push(...gate.failed_checks.map((c: string) => `${instId}: ${c}`));
        }
      }
      console.log(`    Pre-check: ${failedChecks.length === 0 ? "PASSED" : "FAILED"}`);
      console.log(`    Created:   ${p.created_at}`);
      console.log("");
    }

    // CLI Interactive prompt for pending proposals
    const pendingProposals = proposals.filter((p) => p.status === "pending_review");
    if (pendingProposals.length > 0) {
      console.log(`  Found ${pendingProposals.length} pending proposal(s) waiting for review.`);
      for (const p of pendingProposals) {
        const answer = await askQuestion(`  Do you want to apply proposal ${p.id}? (y/n): `);
        if (answer.trim().toLowerCase() === "y" || answer.trim().toLowerCase() === "yes") {
          applyProposal(p.id, db);
        }
      }
    }
  }
}
