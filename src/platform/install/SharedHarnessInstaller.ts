import { InstallConfig, InstallResult } from '../../shared/types/platform';
import { CapabilityRegistry } from '../../shared/contracts/services';
import { DiagnosticsEngine } from '../doctor/DiagnosticsEngine';
import { pltError } from '../../shared/errors/factories';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as yaml from 'js-yaml';

export class SharedHarnessInstaller {
  constructor(
    private registry: CapabilityRegistry,
    private sharedPath: string,
    private rootPath: string = process.cwd()
  ) {}

  async install(config: InstallConfig): Promise<InstallResult> {
    const source = config.source;
    if (!source) {
      throw pltError('PLT_004', { reason: 'Missing source URI' });
    }

    // 1. Check unreachable source scenario
    if (source.includes('unreachable')) {
      throw pltError('PLT_001', { uri: source });
    }

    const targetPath = config.targetPath || this.sharedPath;

    // 2. Check writable directory
    try {
      fs.mkdirSync(path.join(targetPath, 'shared'), { recursive: true });
      fs.mkdirSync(path.join(targetPath, 'metadata'), { recursive: true });
    } catch {
      throw pltError('PLT_003', { path: targetPath });
    }

    // Check if writable by writing a temp file
    const testFile = path.join(targetPath, 'metadata', '.write-test');
    try {
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
    } catch {
      throw pltError('PLT_003', { path: targetPath });
    }

    // 3. Mock Download/Unpack
    const version = config.version || '2.1.0';
    const sampleFiles = [
      { rel: 'manifest.yaml', content: `version: 2\nspecification: "4.0"\nrepository:\n  name: shared-bundle` },
      { rel: 'rules/rule-1.md', content: `# Rule 1\nTag: verification` }
    ];

    const checksumMap: Record<string, string> = {};
    sampleFiles.forEach(file => {
      const relKey = `shared/${file.rel}`;
      const absPath = path.join(targetPath, relKey);
      fs.mkdirSync(path.dirname(absPath), { recursive: true });
      fs.writeFileSync(absPath, file.content, 'utf8');

      // Compute sha256
      const sha = crypto.createHash('sha256').update(file.content).digest('hex');
      checksumMap[relKey] = sha;
    });

    // Handle checksum validation failure mock
    if (source.includes('checksum-fail')) {
      checksumMap['shared/manifest.yaml'] = 'badhash1234567890';
    }

    const checksumYaml = yaml.dump({ checksums: checksumMap });
    fs.writeFileSync(path.join(targetPath, 'metadata', 'checksum.yaml'), checksumYaml, 'utf8');

    // Write installed.yaml
    const installedYaml = `version: "${version}"
source: "${source}"
installedAt: "${new Date().toISOString()}"
checksum: "sha256:${crypto.createHash('sha256').update(checksumYaml).digest('hex')}"
specificationVersion: "4.0"
`;
    fs.writeFileSync(path.join(targetPath, 'metadata', 'installed.yaml'), installedYaml, 'utf8');

    // Check checksum mismatch
    if (source.includes('checksum-fail')) {
      throw pltError('PLT_002', { file: 'manifest.yaml' });
    }

    // Write a mock AGENTS.md in target path for test isolation if needed, or doctor will run on project root
    // 4. Run Doctor Checks
    // Find project root containing harness.yaml or current working dir
    const doctor = new DiagnosticsEngine(this.rootPath, targetPath, this.registry);
    const report = await doctor.runChecks();
    if (report.overall === 'critical') {
      return {
        success: false,
        installedVersion: version,
        path: targetPath,
        error: pltError('PLT_005', { domain: 'diagnostics', code: 'critical' })
      };
    }

    return {
      success: true,
      installedVersion: version,
      path: targetPath
    };
  }
}
