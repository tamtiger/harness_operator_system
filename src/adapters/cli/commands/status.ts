import { RepositoryServiceImpl } from '../../../repository/service';
import { createPlatformService } from '../factory';
import { OutputFormatter } from '../formatter/OutputFormatter';
import { ErrorFormatter } from '../formatter/ErrorFormatter';
import * as path from 'path';

export async function runStatus(options: any = {}) {
  const formatter = new OutputFormatter();
  const errFormatter = new ErrorFormatter();
  const targetDir = path.resolve(options.cwd || '.');
  const repoService = new RepositoryServiceImpl();
  const platform = createPlatformService(targetDir, options.harnessHome);

  try {
    const root = repoService.discover(targetDir);
    const manifest = repoService.loadManifest(root);

    // Validate first
    const valResult = await platform.validate(targetDir);
    if (!valResult.valid) {
      const formattedVal = formatter.format(valResult, 'validate', options);
      console.error(formattedVal);
      process.exit(2);
    }

    let shared: any = { rules: [], prompts: [], templates: [], workflows: [], knowledge: [], hooks: [], capabilities: [] };
    let sharedInstalled = false;
    let sharedVersion = 'unknown';

    try {
      const defaultSharedPath = repoService.loadSharedAssets(options.harnessHome || '');
      shared = defaultSharedPath;
      sharedInstalled = true;
      sharedVersion = '2.1.0';
    } catch (err: any) {
      if (err.code === 'REPO_008') {
        const formattedErr = errFormatter.formatError(err, options);
        console.error(formattedErr);
        process.exit(2);
      }
      throw err;
    }

    const local = repoService.loadLocalAssets(root, manifest);
    const effective = repoService.resolveAssets(shared, local);

    const statusData = {
      repository: root.path,
      sharedHarness: {
        installed: sharedInstalled,
        version: sharedVersion
      },
      assets: {
        rules: { shared: shared.rules.length, local: local.rules.length, effective: effective.rules.length },
        prompts: { shared: shared.prompts.length, local: local.prompts.length, effective: effective.prompts.length },
        templates: { shared: shared.templates.length, local: local.templates.length, effective: effective.templates.length },
        workflows: { shared: shared.workflows.length, local: local.workflows.length, effective: effective.workflows.length },
        knowledge: { shared: shared.knowledge.length, local: local.knowledge.length, effective: effective.knowledge.length },
        hooks: { shared: shared.hooks.length, local: local.hooks.length, effective: effective.hooks.length },
        capabilities: { shared: shared.capabilities.length, local: local.capabilities.length, effective: effective.capabilities.length }
      },
      context: 'ready'
    };

    const formatted = formatter.format(statusData, 'status', options);
    if (formatted) {
      console.log(formatted);
    }
    process.exit(0);
  } catch (err: any) {
    console.error(errFormatter.formatError(err, options));
    process.exit(2);
  }
}
