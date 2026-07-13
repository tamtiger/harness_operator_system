import * as fs from 'fs';
import { createPlatformService } from '../../factory';
import { OutputFormatter } from '../../formatter/OutputFormatter';
import { ErrorFormatter } from '../../formatter/ErrorFormatter';

export async function runProposalSubmit(id: string | undefined, options: any = {}) {
  const formatter = new OutputFormatter();
  const errFormatter = new ErrorFormatter();
  const service = createPlatformService(options.cwd, options.harnessHome);

  try {
    // --file <path>: create a new proposal from a markdown file
    if (options.file) {
      if (!fs.existsSync(options.file)) {
        console.error(`✗ File not found: ${options.file}`);
        process.exit(2);
      }
      const content = fs.readFileSync(options.file, 'utf8');
      // Extract title from first H1 heading, fallback to filename
      const titleMatch = content.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1].trim() : `Proposal from ${options.file}`;

      const request = {
        title,
        description: content,
        type: options.type || 'rule',
        proposedContent: content,
        targetAsset: options.file,
        rationale: options.rationale || 'Submitted via --file flag',
        evidence: []
      };

      const prop = await service.submitProposal(request);
      const formatted = formatter.format(prop, 'proposal_submit', options);
      if (formatted) console.log(formatted);
      process.exit(0);
    }

    // Positional <id>: submit an existing draft proposal by ID
    if (!id) {
      console.error('✗ Provide either a proposal <id> or --file <path>');
      process.exit(2);
    }

    const prop = await service.submitExistingProposal(id);
    const formatted = formatter.format(prop, 'proposal_submit', options);
    if (formatted) console.log(formatted);
    process.exit(0);
  } catch (err: any) {
    console.error(errFormatter.formatError(err, options));
    process.exit(2);
  }
}
