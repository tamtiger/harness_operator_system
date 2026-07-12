import { SyncConfig, SyncResult } from '../../shared/types/platform';
import { ContextService } from '../../shared/contracts/services';
import { HarnessError } from '../../shared/errors/HarnessError';
import { ErrorDomain } from '../../shared/types/enums';
import * as fs from 'fs';
import * as path from 'path';

export class SharedHarnessSynchronizer {
  constructor(
    private contextService: ContextService,
    private sharedPath: string
  ) {}

  async sync(config: SyncConfig): Promise<SyncResult> {
    const installedFile = path.join(this.sharedPath, 'metadata', 'installed.yaml');
    if (!fs.existsSync(installedFile)) {
      return { success: false, syncedAssets: 0, error: new HarnessError('REPO_008', ErrorDomain.REPOSITORY, 'Shared harness not installed', false) };
    }

    this.contextService.invalidateCache('assets-cache-key');

    return {
      success: true,
      syncedAssets: 0
    };
  }
}
