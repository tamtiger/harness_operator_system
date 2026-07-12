import * as fs from 'fs';
import * as path from 'path';

export async function runInit(targetDirArg?: string) {
  const targetDir = path.resolve(targetDirArg || '.');
  const harnessDir = path.join(targetDir, '.harness');
  const manifestPath = path.join(harnessDir, 'harness.yaml');
  const agentsPath = path.join(targetDir, 'AGENTS.md');
  const repoMapPath = path.join(harnessDir, 'repository-map.md');
  const rulesDir = path.join(harnessDir, 'rules');

  if (fs.existsSync(manifestPath)) {
    console.error('✗ Project is already initialized (.harness/harness.yaml exists).');
    process.exit(1);
  }

  try {
    fs.mkdirSync(rulesDir, { recursive: true });

    const defaultManifest = `version: 2
specification: "4.0"
repository:
  root: "."
agent:
  entry_point: "AGENTS.md"
artifacts:
  - type: repository-map
    path: ".harness/repository-map.md"
  - type: rule
    path: ".harness/rules/"
`;
    fs.writeFileSync(manifestPath, defaultManifest, 'utf8');

    const defaultAgents = `# AGENTS.md — Harness Platform

> **Harness Version:** 4.0
> **Purpose:** Operational Contract for all AI Agents contributing to the Harness Platform.
`;
    fs.writeFileSync(agentsPath, defaultAgents, 'utf8');

    const defaultRepoMap = `# Repository Map
`;
    fs.writeFileSync(repoMapPath, defaultRepoMap, 'utf8');

    console.log('✓ Project successfully initialized!');
    console.log('Created:');
    console.log('  - .harness/harness.yaml');
    console.log('  - .harness/repository-map.md');
    console.log('  - .harness/rules/');
    console.log('  - AGENTS.md');
    process.exit(0);
  } catch (err: any) {
    console.error(`✗ Initialization failed: ${err.message}`);
    process.exit(2);
  }
}
