import { createPlatformService } from '../../factory';
import { OutputFormatter } from '../../formatter/OutputFormatter';
import { ErrorFormatter } from '../../formatter/ErrorFormatter';

export async function runProposalRequestChanges(id: string, options: any = {}) {
  const formatter = new OutputFormatter();
  const errFormatter = new ErrorFormatter();
  const service = createPlatformService(options.cwd, options.harnessHome) as any;

  try {
    const reviewer = options.reviewer || 'admin';
    const comments = options.comments || 'Changes requested via CLI';
    const prop = await service.orchestrator.gov.requestChanges(id, reviewer, comments);
    const formatted = formatter.format(prop, 'proposal_approve', options);
    if (formatted) console.log(formatted);
    process.exit(0);
  } catch (err: any) {
    console.error(errFormatter.formatError(err, options));
    process.exit(2);
  }
}
