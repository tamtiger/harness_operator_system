import { createPlatformService } from '../../factory';
import { OutputFormatter } from '../../formatter/OutputFormatter';
import { ErrorFormatter } from '../../formatter/ErrorFormatter';

export async function runProposalPromote(id: string, options: any = {}) {
  const formatter = new OutputFormatter();
  const errFormatter = new ErrorFormatter();
  // promote is on GovernanceService, accessed via orchestrator; wire through a thin wrapper on platform
  const service = createPlatformService(options.cwd, options.harnessHome) as any;

  try {
    // GovernanceService.promote() returns PromotionResult
    const result = await service.orchestrator.gov.promote(id);
    const formatted = formatter.format(result, 'proposal_approve', options);
    if (formatted) console.log(formatted);
    process.exit(0);
  } catch (err: any) {
    console.error(errFormatter.formatError(err, options));
    process.exit(2);
  }
}
