import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { Manifest } from '../../shared/types/repository';
import { mftError } from '../../shared/errors/factories';
import { ManifestValidator } from './ManifestValidator';

export class ManifestLoader {
  private validator = new ManifestValidator();

  load(rootPath: string): Manifest {
    const manifestPath = path.join(rootPath, '.harness', 'harness.yaml');
    if (!fs.existsSync(manifestPath)) {
      throw mftError('MFT_001');
    }

    let content: string;
    try {
      content = fs.readFileSync(manifestPath, 'utf8');
    } catch (e: any) {
      throw mftError('MFT_001', { details: e.message });
    }

    let parsed: unknown;
    try {
      parsed = yaml.load(content);
    } catch (e: any) {
      throw mftError('MFT_002', {
        details: `Invalid YAML syntax: ${e.message}`,
        line: e.mark?.line + 1,
        column: e.mark?.column + 1
      });
    }

    return this.validator.validate(parsed, rootPath);
  }
}
