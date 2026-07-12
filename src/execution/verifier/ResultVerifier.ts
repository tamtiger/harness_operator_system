import { CapabilityResult } from '../../shared/types/capability';
import { RuntimeContext } from '../../shared/types/repository';
import { execError } from '../../shared/errors/factories';

export interface VerificationPolicy {
  mode?: 'fail_fast' | 'collect_all';
}

export class ResultVerifier {
  verify(results: CapabilityResult[], context: RuntimeContext, policy: VerificationPolicy = {}): void {
    const mode = policy.mode || 'fail_fast';
    const errors: string[] = [];

    // Check if every result is successful
    for (const res of results) {
      if (!res.success) {
        const errorMsg = res.error?.message || 'Unknown capability error';
        if (mode === 'fail_fast') {
          throw execError('EXEC_006', { rule: `${res.capabilityId}: ${errorMsg}` });
        } else {
          errors.push(`${res.capabilityId}: ${errorMsg}`);
        }
      }
    }

    if (errors.length > 0) {
      throw execError('EXEC_006', { rule: errors.join('; ') });
    }
  }
}
