import * as fs from 'fs';
import * as path from 'path';

export function runInit(targetPathArg?: string, options: { force?: boolean } = {}) {
  const targetDir = path.resolve(targetPathArg || '.');
  const harnessDir = path.join(targetDir, '.harness');
  const manifestPath = path.join(harnessDir, 'harness.yaml');
  const repoMapPath = path.join(harnessDir, 'repository-map.md');
  const rulesDir = path.join(harnessDir, 'rules');
  const agentsPath = path.join(targetDir, 'AGENTS.md');

  if (fs.existsSync(harnessDir) && !options.force) {
    console.error(`[ERROR] .harness/ directory already exists. Use --force to overwrite.`);
    process.exit(2);
  }

  // Create directories
  fs.mkdirSync(rulesDir, { recursive: true });

  // 1. Create harness.yaml
  const manifestTemplate = `version: 2
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
  fs.writeFileSync(manifestPath, manifestTemplate, 'utf8');

  // 2. Create repository-map.md
  const repoMapTemplate = `# Repository Map
  
This file contains the structure map of the repository.
`;
  fs.writeFileSync(repoMapPath, repoMapTemplate, 'utf8');

  // 3. Create AGENTS.md using template if exists, else generic
  let agentsContent = '';
  const templatePath = path.resolve(__dirname, '../../../src/shared/templates/AGENTS_TEMPLATE.md');
  if (fs.existsSync(templatePath)) {
    const template = fs.readFileSync(templatePath, 'utf8');
    agentsContent = template
      .replace('{{HARNESS_VERSION}}', '4.0')
      .replace('{{TEMPLATE_VERSION}}', '1.0')
      .replace('{{GENERATED_TIME}}', new Date().toISOString())
      .replace('{{PROJECT_NAME}}', path.basename(targetDir))
      .replace('{{PROJECT_DOMAIN}}', 'Development')
      .replace('{{PROJECT_ARCHITECTURE_OVERVIEW}}', 'Standard Architecture')
      .replace('{{PROJECT_ENTRY_POINT}}', 'AGENTS.md')
      .replace('{{BUILD_COMMAND_RESTORE}}', 'npm install')
      .replace('{{BUILD_COMMAND_BUILD}}', 'npm run build')
      .replace('{{BUILD_COMMAND_TEST}}', 'npm run test');
  } else {
    agentsContent = `# AGENTS.md
> **Harness Version:** 4.0
> **Purpose:** Operational Contract for AI Agents.
`;
  }
  fs.writeFileSync(agentsPath, agentsContent, 'utf8');

  console.log(`✓ Initialized .harness/ in ${targetDir}`);
}
