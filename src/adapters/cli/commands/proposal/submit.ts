import { createPlatformService } from '../../factory';
import { OutputFormatter } from '../../formatter/OutputFormatter';
import { ErrorFormatter } from '../../formatter/ErrorFormatter';

export async function runProposalSubmit(id: string, options: any = {}) {
  const formatter = new OutputFormatter();
  const errFormatter = new ErrorFormatter();
  const service = createPlatformService(options.cwd, options.harnessHome);

  try {
    const request = {
      title: options.title || `Proposal for asset ${id}`,
      description: options.description || `Auto-submitted proposal for ${id}`,
      type: options.type || 'rule',
      proposedContent: options.content || `content-for-${id}`,
      targetAsset: id,
      rationale: options.rationale || 'Auto rationale',
      evidence: options.evidence ? options.evidence.split(',').map((content: string, idx: number) => ({
        id: `ev-${idx}-${Date.now()}`,
        type: 'human_observation' as const,
        source: 'cli',
        content: content.trim(),
        timestamp: new Date().toISOString()
      })) : []
    };

    const prop = await service.submitProposal(request);

    const formatted = formatter.format(prop, 'proposal_submit', options);
    if (formatted) {
      console.log(formatted);
    }
    process.exit(0);
  } catch (err: any) {
    console.error(errFormatter.formatError(err, options));
    process.exit(2);
  }
}
