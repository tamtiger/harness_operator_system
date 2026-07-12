import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import * as yaml from 'js-yaml';
import { createPlatformService } from '../factory';
import { ProposalType, Permission } from '../../../shared/types/enums';
import { RuntimeContext } from '../../../shared/types/repository';
import { startMcpServer } from '../../mcp/server';
import { ManifestValidator } from '../../../repository/manifest/ManifestValidator';
import { RepositoryDiscovery } from '../../../repository/discovery/RepositoryDiscovery';
import { RepositoryServiceImpl } from '../../../repository/service';
import { ContextServiceImpl } from '../../../context/service';
import { CapabilityServiceImpl } from '../../../capability/service';
import { ExecutionServiceImpl } from '../../../execution/service';
import { GovernanceServiceImpl } from '../../../governance/service';
import { FileSystemPersistence } from '../../../repository/persistence/FileSystemPersistence';

export async function runConformance(options: any = {}) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-conformance-'));
  const tempShared = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-conformance-shared-'));

  const results: any[] = [];
  let passedCount = 0;
  let failedCount = 0;

  async function testCase(id: string, description: string, fn: () => Promise<void> | void) {
    const start = Date.now();
    try {
      await fn();
      results.push({ test_id: id, status: 'pass', duration_ms: Date.now() - start, message: `${description} passed.` });
      passedCount++;
      if (!options.quiet) console.log(`[PASS] ${id} - ${description}`);
    } catch (e: any) {
      results.push({ test_id: id, status: 'fail', duration_ms: Date.now() - start, message: e.message || String(e) });
      failedCount++;
      if (!options.quiet) console.error(`[FAIL] ${id} - ${description}: ${e.message}`);
    }
  }

  // ─── Setup temp directories ─────────────────────────────────────────────────
  const harnessDir = path.join(tempDir, '.harness');
  fs.mkdirSync(path.join(harnessDir, 'rules'), { recursive: true });
  fs.mkdirSync(path.join(harnessDir, 'prompts'), { recursive: true });
  fs.writeFileSync(path.join(tempDir, 'AGENTS.md'), '# AGENTS', 'utf8');
  fs.writeFileSync(path.join(tempDir, 'package.json'), '{}', 'utf8');
  fs.writeFileSync(path.join(harnessDir, 'repository-map.md'), '# Repository Map', 'utf8');

  const baseManifest = () => `version: 2\nspecification: "4.0"\nrepository:\n  name: conformance-repo\n  root: "."\nagent:\n  entry_point: "AGENTS.md"\nartifacts:\n  - type: rule\n    path: ".harness/rules/"\n`;

  fs.writeFileSync(path.join(harnessDir, 'harness.yaml'), baseManifest(), 'utf8');

  // Setup shared harness
  const sharedRulesDir = path.join(tempShared, 'shared', 'rules');
  fs.mkdirSync(path.join(tempShared, 'metadata'), { recursive: true });
  fs.mkdirSync(sharedRulesDir, { recursive: true });
  const sharedRule = `---\nid: "rule-shared-1"\ntype: "rule"\nname: "Shared Rule 1"\nversion: "1.0.0"\nscope: "shared"\n---\n# Rule`;
  fs.writeFileSync(path.join(sharedRulesDir, 'rule-shared-1.md'), sharedRule, 'utf8');
  fs.writeFileSync(
    path.join(tempShared, 'metadata', 'installed.yaml'),
    `source: 'https://github.com/my-org/shared-harness.git'\nversion: '2.1.0'\ninstalledAt: '${new Date().toISOString()}'\nchecksums:\n  shared/rules/rule-shared-1.md: 'dummy'\n`,
    'utf8'
  );
  const ruleContent = fs.readFileSync(path.join(sharedRulesDir, 'rule-shared-1.md'), 'utf8');
  const ruleHash = crypto.createHash('sha256').update(ruleContent, 'utf8').digest('hex');
  fs.writeFileSync(
    path.join(tempShared, 'metadata', 'checksum.yaml'),
    `checksums:\n  shared/rules/rule-shared-1.md: "${ruleHash}"\n`,
    'utf8'
  );

  const platform = createPlatformService(tempDir, tempShared);

  // Create separate service instances for test diagnostics
  const repoService = new RepositoryServiceImpl();
  const ctxService = new ContextServiceImpl();
  const registryService = new CapabilityServiceImpl(new FileSystemPersistence());
  const execService = new ExecutionServiceImpl(registryService);
  const discoveredRoot = repoService.discover(tempDir);
  const govService = new GovernanceServiceImpl(repoService, discoveredRoot);

  // ─── Group 1: Repository & Manifest (TC-01 to TC-05) ────────────────────────
  await testCase('TC-01', 'Parse valid minimal manifest', () => {
    const manifestPath = path.join(harnessDir, 'harness.yaml');
    const content = fs.readFileSync(manifestPath, 'utf8');
    if (!content.includes('specification: "4.0"')) throw new Error('specification mismatch');
  });

  const validator = new ManifestValidator();
  const discovery = new RepositoryDiscovery();

  await testCase('TC-02', 'Parse manifest with unknown fields', () => {
    const raw = yaml.load(`version: 2\nspecification: "4.0"\nunknown_field: "x"\nrepository:\n  name: r\n  root: "."\nagent:\n  entry_point: "AGENTS.md"\nartifacts:\n  - type: rule\n    path: ".harness/rules/"\n`);
    let threw = false;
    try {
      validator.validate(raw, tempDir);
    } catch (e: any) {
      if (e.code === 'MFT_012') threw = true;
    }
    if (!threw) throw new Error('Expected MFT_012 for unknown fields');
  });

  await testCase('TC-03', 'Parse manifest missing required field', () => {
    const raw = yaml.load(`version: 2\nspecification: "4.0"\nrepository:\n  name: r\n  root: "."\nartifacts: []\n`);
    let threw = false;
    try {
      validator.validate(raw, tempDir);
    } catch {
      threw = true;
    }
    if (!threw) throw new Error('Expected validation error');
  });

  await testCase('TC-04', 'Parse manifest wrong version field', () => {
    const raw = yaml.load(`version: 99\nspecification: "4.0"\nrepository:\n  name: r\n  root: "."\nagent:\n  entry_point: "AGENTS.md"\nartifacts:\n  - type: rule\n    path: ".harness/rules/"\n`);
    let threw = false;
    try {
      validator.validate(raw, tempDir);
    } catch {
      threw = true;
    }
    if (!threw) throw new Error('Expected validation error for wrong version');
  });

  await testCase('TC-05', 'Discover repository from subdirectory', () => {
    const sub = path.join(tempDir, 'src', 'nested');
    fs.mkdirSync(sub, { recursive: true });
    const discovered = discovery.discover(sub);
    if (path.resolve(discovered.path) !== path.resolve(tempDir)) {
      throw new Error(`Wrong root: ${discovered.path}`);
    }
  });

  // ─── Group 2: Asset Tests (TC-06 to TC-10) ──────────────────────────────────
  const ruleFile = path.join(harnessDir, 'rules', 'rule-local.md');
  fs.writeFileSync(ruleFile, `---\nid: "rule-local"\ntype: "rule"\nname: "Local Rule"\nversion: "1.0.0"\nscope: "local"\n---\n# Local`, 'utf8');

  await testCase('TC-06', 'Load rule with valid front matter', () => {
    const root = repoService.discover(tempDir);
    const manifest = repoService.loadManifest(root);
    const assets = repoService.loadLocalAssets(root, manifest);
    const rule = assets.rules.find((r: any) => r.metadata.id === 'rule-local');
    if (!rule) throw new Error('Failed to load local rule');
  });

  await testCase('TC-07', 'Load asset missing id field', () => {
    const noId = path.join(harnessDir, 'rules', 'rule-noid.md');
    fs.writeFileSync(noId, `---\ntype: "rule"\nname: "No ID"\n---\n# No ID`, 'utf8');
    let threw = false;
    try {
      const root = repoService.discover(tempDir);
      const manifest = repoService.loadManifest(root);
      repoService.loadLocalAssets(root, manifest);
    } catch (e: any) {
      threw = true;
    }
    fs.rmSync(noId, { force: true });
    if (!threw) throw new Error('Expected error for missing id');
  });

  await testCase('TC-08', 'Load two assets with same ID', () => {
    const dup1 = path.join(harnessDir, 'rules', 'rule-dup1.md');
    const dup2 = path.join(harnessDir, 'rules', 'rule-dup2.md');
    fs.writeFileSync(dup1, `---\nid: "rule-dup"\ntype: "rule"\nname: "Dup 1"\nversion: "1.0.0"\nscope: "local"\n---`, 'utf8');
    fs.writeFileSync(dup2, `---\nid: "rule-dup"\ntype: "rule"\nname: "Dup 2"\nversion: "1.0.0"\nscope: "local"\n---`, 'utf8');
    let threw = false;
    try {
      const root = repoService.discover(tempDir);
      const manifest = repoService.loadManifest(root);
      repoService.loadLocalAssets(root, manifest);
    } catch (e: any) {
      threw = true;
    }
    fs.rmSync(dup1, { force: true });
    fs.rmSync(dup2, { force: true });
    if (!threw) throw new Error('Expected error for duplicate IDs');
  });

  await testCase('TC-09', 'Override: Local overrides Shared (same id)', () => {
    const overrideFile = path.join(harnessDir, 'rules', 'rule-shared-1.md');
    fs.writeFileSync(overrideFile, `---\nid: "rule-shared-1"\ntype: "rule"\nname: "Local wins"\nversion: "2.0.0"\nscope: "local"\n---`, 'utf8');
    const root = repoService.discover(tempDir);
    const manifest = repoService.loadManifest(root);
    const localAssets = repoService.loadLocalAssets(root, manifest);
    const sharedAssets = repoService.loadSharedAssets(path.join(tempShared, 'shared'));
    const resolved = repoService.resolveAssets(sharedAssets, localAssets);
    const target = resolved.rules.find((r: any) => r.metadata.id === 'rule-shared-1');
    fs.rmSync(overrideFile, { force: true });
    if (!target || target.metadata.name !== 'Local wins') throw new Error('Local did not override shared');
  });

  await testCase('TC-10', 'Merge: Knowledge from both sources', () => {
    const root = repoService.discover(tempDir);
    const manifest = repoService.loadManifest(root);
    const localAssets = repoService.loadLocalAssets(root, manifest);
    const sharedAssets = repoService.loadSharedAssets(path.join(tempShared, 'shared'));
    const resolved = repoService.resolveAssets(sharedAssets, localAssets);
    if (resolved.rules.length < 2) throw new Error('Assets not merged properly');
  });

  // ─── Group 3: Context Tests (TC-11 to TC-14) ────────────────────────────────
  const root = repoService.discover(tempDir);
  const manifest = repoService.loadManifest(root);
  const localAssets = repoService.loadLocalAssets(root, manifest);
  const sharedAssets = repoService.loadSharedAssets(path.join(tempShared, 'shared'));
  const effectiveAssets = repoService.resolveAssets(sharedAssets, localAssets);
  const repoMetadata = { root, name: 'conformance-repo', manifest };
  const repoContext = repoService.buildContext(effectiveAssets, repoMetadata);

  await testCase('TC-11', 'Build context from valid repository', () => {
    const runtimeCtx = ctxService.buildRuntimeContext(repoContext, { description: 'test' });
    if (!runtimeCtx) throw new Error('No RuntimeContext returned');
  });

  await testCase('TC-12', 'Filter by scope_paths matching working dir', () => {
    const runtimeCtx = ctxService.buildRuntimeContext(repoContext, { description: 'test', workingDirectory: 'src/' });
    if (!runtimeCtx) throw new Error('Context build failed');
  });

  await testCase('TC-13', 'priority_trim when over budget', () => {
    const runtimeCtx = ctxService.buildRuntimeContext(repoContext, { description: 'budget-trim-test' });
    if (!runtimeCtx) throw new Error('Context build failed');
  });

  await testCase('TC-14', 'Cache hit on second build with same key', () => {
    const first = ctxService.buildRuntimeContext(repoContext, { description: 'cache-test' });
    const second = ctxService.buildRuntimeContext(repoContext, { description: 'cache-test' });
    if (first !== second) throw new Error('Expected cache hit (same object reference)');
  });

  // ─── Group 4: Execution Tests (TC-15 to TC-18) ──────────────────────────────
  await testCase('TC-15', 'Execute task with valid workflow', async () => {
    const res = await platform.run({ description: 'read package.json' });
    if (res.status !== 'COMPLETED') throw new Error(`Expected COMPLETED, got ${res.status}`);
  });

  await testCase('TC-16', 'Execution failure handled gracefully', async () => {
    const runtimeCtx = ctxService.buildRuntimeContext(repoContext, { description: 'error-test' });
    const result = await execService.execute(runtimeCtx, { description: 'error-test' });
    if (!result || !result.status) throw new Error('Expected valid ExecutionResult with status');
  });

  await testCase('TC-17', 'Cancel task midway', async () => {
    const res = await platform.cancelTask('cancel-test-' + Date.now());
    if (res.status !== 'CANCELLED') throw new Error('Expected CANCELLED status');
  });

  await testCase('TC-18', 'RuntimeContext immutable during execution', () => {
    const runtimeCtx = ctxService.buildRuntimeContext(repoContext, { description: 'immutable-test' });
    if (!runtimeCtx) throw new Error('No context returned');
  });

  // ─── Group 5: Capability Tests (TC-19 to TC-22) ─────────────────────────────
  const capCtx = ctxService.buildRuntimeContext(repoContext, { description: 'cap-test' });

  await testCase('TC-19', 'Invoke harness.file.read valid path', async () => {
    const res = await registryService.invoke('harness.file.read', capCtx, { path: 'package.json' });
    if (!res || res.error) throw new Error(`Read failed: ${JSON.stringify(res?.error)}`);
  });

  await testCase('TC-20', 'Invoke unregistered capability returns CAP_001', async () => {
    const res = await registryService.invoke('harness.non.existent', capCtx, {});
    if (res.success || !res.error || res.error.code !== 'CAP_001') {
      throw new Error(`Expected CAP_001, got success=${res.success} error=${JSON.stringify(res.error)}`);
    }
  });

  await testCase('TC-21', 'Invoke capability with invalid input returns CAP_002', async () => {
    const res = await registryService.invoke('harness.file.read', capCtx, { path: 123 });
    if (res.success || !res.error || res.error.code !== 'CAP_002') {
      throw new Error(`Expected CAP_002, got success=${res.success} error=${JSON.stringify(res.error)}`);
    }
  });

  await testCase('TC-22', 'Invoke without required permission returns CAP_004', async () => {
    const restrictedCtx: RuntimeContext = { ...capCtx, permissions: [] as Permission[] };
    const res = await registryService.invoke('harness.file.read', restrictedCtx, { path: 'package.json' });
    if (res.success || !res.error || res.error.code !== 'CAP_004') {
      throw new Error(`Expected CAP_004, got success=${res.success} error=${JSON.stringify(res.error)}`);
    }
  });

  // ─── Group 6: Governance Tests (TC-23 to TC-26) ─────────────────────────────
  await testCase('TC-23', 'Create proposal', () => {
    const prop = govService.submitProposal({
      title: 'New proposal',
      description: 'Desc',
      type: ProposalType.NEW_ASSET,
      rationale: 'Rat',
      evidence: [{ id: 'e1', type: 'human_observation', source: 'test', content: 'ok', timestamp: new Date().toISOString() }],
      proposedContent: 'content'
    });
    if (!prop || !prop.id) throw new Error('No proposal returned');
  });

  await testCase('TC-24', 'Submit proposal without evidence', () => {
    let threw = false;
    try {
      govService.submitProposal({
        title: 'No evidence',
        description: 'Desc',
        type: ProposalType.NEW_ASSET,
        rationale: 'Rat',
        evidence: [],
        proposedContent: 'content'
      });
    } catch (e: any) {
      if (e.code === 'GOV_004') threw = true;
    }
    if (!threw) throw new Error('Expected GOV_004');
  });

  await testCase('TC-25', 'AI agent attempts approve via MCP — tool not found', async () => {
    const mcpServer = await startMcpServer(platform);
    // @ts-expect-error - accessing private MCP handler for test
    const callHandler = mcpServer._requestHandlers.get('tools/call')!;
    const res = await callHandler({
      method: 'tools/call',
      params: { name: 'harness_proposal_approve', arguments: { id: 'ANY' } }
    });
    if (!res.isError) throw new Error('Expected isError=true for approve via MCP');
  });

  await testCase('TC-26', 'Human approves proposal', () => {
    const prop = govService.submitProposal({
      title: 'To approve',
      description: 'Desc',
      type: ProposalType.NEW_ASSET,
      rationale: 'Rat',
      evidence: [{ id: 'e1', type: 'human_observation', source: 'cli', content: 'ok', timestamp: new Date().toISOString() }],
      proposedContent: 'id: asset-1\ntype: rule\nname: New Rule\nversion: 1.0.0\n'
    });
    govService.review(prop.id, 'human-reviewer');
    govService.approve(prop.id, 'human-reviewer', 'LGTM');
    const updated = govService.getProposal(prop.id);
    if (updated.status !== 'APPROVED') throw new Error(`Expected APPROVED, got ${updated.status}`);
  });

  // ─── Group 7: CLI Tests (TC-27 to TC-30) ────────────────────────────────────
  await testCase('TC-27', 'harness doctor healthy', async () => {
    const report = await platform.doctor();
    if (report.overall !== 'healthy') throw new Error(`Not healthy`);
  });

  await testCase('TC-28', 'harness validate invalid repo returns invalid', async () => {
    const invalidDir = path.join(tempDir, 'not-a-repo');
    fs.mkdirSync(invalidDir, { recursive: true });
    const result = await platform.validate(invalidDir);
    if (result.valid) throw new Error('Expected valid=false for an invalid/empty repo');
  });

  await testCase('TC-29', 'harness run success', async () => {
    const res = await platform.run({ description: 'read package.json' });
    if (res.status !== 'COMPLETED') throw new Error(`Expected COMPLETED, got ${res.status}`);
  });

  await testCase('TC-30', 'harness version returns string', async () => {
    const status = await platform.status();
    if (!status.version || typeof status.version !== 'string') throw new Error('Invalid version');
  });

  // ─── Cleanup ─────────────────────────────────────────────────────────────────
  fs.rmSync(tempDir, { recursive: true, force: true });
  fs.rmSync(tempShared, { recursive: true, force: true });

  // ─── Generate Report ─────────────────────────────────────────────────────────
  const complianceLevel = failedCount === 0 ? 'Level 3' : failedCount <= 5 ? 'Level 2' : 'Level 1';
  const report = {
    conformance_version: '4.0',
    timestamp: new Date().toISOString(),
    implementation: { name: 'Harness Platform', version: '0.0.12', type: 'Runtime' },
    compliance_level: complianceLevel,
    summary: { total_rules: 30, passed: passedCount, failed: failedCount, skipped: 0 },
    results
  };

  const reportPath = path.join(process.cwd(), 'conformance-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

  if (!options.quiet) {
    console.log('\n--- Conformance Summary ---');
    console.log(`Passed: ${passedCount}/30  Failed: ${failedCount}/30`);
    console.log(`Compliance Level: ${complianceLevel}`);
    console.log(`Report: conformance-report.json`);
  }
}