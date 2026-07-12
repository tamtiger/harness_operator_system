import { createPlatformService } from '../factory';
import { OutputFormatter } from '../formatter/OutputFormatter';
import { ErrorFormatter } from '../formatter/ErrorFormatter';

export async function runPublish(assetPath: string, options: any = {}) {
  const formatter = new OutputFormatter();
  const errFormatter = new ErrorFormatter();
  const service = createPlatformService(options.cwd, options.harnessHome);

  try {
    const res = await service.publish({
      assetIds: [assetPath],
      commitMessage: options.message || `Publish asset: ${assetPath}`
    });

    const formatted = formatter.format(res, 'publish', options);
    if (formatted) {
      console.log(formatted);
    }

    if (res.success) {
      if (!res.proposalId) {
        process.exit(1); // nothing
      }
      process.exit(0); // published
    } else {
      process.exit(2);
    }
  } catch (err: any) {
    console.error(errFormatter.formatError(err, options));
    process.exit(2);
  }
}
