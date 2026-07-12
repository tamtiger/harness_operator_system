import { RepositoryServiceImpl } from '../../../repository/service';
import { ContextServiceImpl } from '../../../context/service';
import { ExecutionServiceImpl } from '../../../execution/service';
import { AssetCollection } from '../../../shared/types/assets';
import * as path from 'path';

export async function runTask(description: string) {
  const targetDir = path.resolve('.');
  const repoService = new RepositoryServiceImpl();
  const contextService = new ContextServiceImpl();
  const execService = new ExecutionServiceImpl();

  try {
    console.log('[PLANNING] Building execution plan...');
    const root = repoService.discover(targetDir);
    const manifest = repoService.loadManifest(root);

    // Context metadata mock
    const metadata = {
      root,
      name: manifest.repository.name || 'unnamed',
      manifest,
      discoveredAt: new Date().toISOString()
    };

    // Load local and shared assets
    let shared: AssetCollection = { rules: [], prompts: [], templates: [], workflows: [], knowledge: [], hooks: [], capabilities: [] };
    try {
      shared = repoService.loadSharedAssets('');
    } catch (e) {
      // ignore
    }

    const local = repoService.loadLocalAssets(root, manifest);
    const effective = repoService.resolveAssets(shared, local);
    const repoContext = repoService.buildContext(effective, metadata);

    const taskRequest = {
      description,
      workingDirectory: '.'
    };

    const runtime = contextService.buildRuntimeContext(repoContext, taskRequest);

    console.log('[RUNNING] Executing steps...');
    const start = Date.now();
    const result = await execService.execute(runtime, taskRequest);
    const duration = Date.now() - start;

    if (result.status === 'COMPLETED') {
      console.log('[VERIFYING] Checking results...');
      console.log(`[COMPLETED] Task finished in ${duration}ms\n`);
      console.log('Results:');
      if (result.results && result.results.length > 0) {
        result.results.forEach((res: any, idx: number) => {
          console.log(`  Step ${idx + 1} (${res.capabilityId}): Success`);
          console.log(`  Output: ${JSON.stringify(res.output, null, 2)}`);
        });
      } else {
        console.log('  No step results produced.');
      }
      process.exit(0);
    } else {
      console.error(`✗ Task execution failed with status: ${result.status}`);
      if (result.error) {
        console.error(`  [ERROR] ${result.error.code}: ${result.error.message}`);
      }
      process.exit(2);
    }
  } catch (err: any) {
    console.error(`✗ Command failed: ${err.message}`);
    process.exit(2);
  }
}
