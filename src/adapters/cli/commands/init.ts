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

    // Read template from package source path
    const templatePath = path.resolve(__dirname, '../../../../src/shared/templates/AGENTS_TEMPLATE.md');
    let defaultAgents = '';
    
    if (fs.existsSync(templatePath)) {
      const templateContent = fs.readFileSync(templatePath, 'utf8');
      const projectName = path.basename(targetDir);
      
      defaultAgents = templateContent
        .replace(/{{HARNESS_VERSION}}/g, '4.0')
        .replace(/{{TEMPLATE_VERSION}}/g, '1.0.0')
        .replace(/{{GENERATED_TIME}}/g, new Date().toLocaleString('vi-VN'))
        .replace(/{{PROJECT_NAME}}/g, projectName)
        .replace(/{{PROJECT_DOMAIN}}/g, 'Software Development')
        .replace(/{{PROJECT_ARCHITECTURE}}/g, 'Domain-driven Design / Modular')
        .replace(/{{PRIMARY_LANGUAGE}}/g, 'TypeScript')
        .replace(/{{PROJECT_ENTRY_POINT}}/g, 'src/index.ts')
        .replace(/{{BUILD_COMMAND_RESTORE}}/g, 'npm install')
        .replace(/{{BUILD_COMMAND_BUILD}}/g, 'npm run build')
        .replace(/{{BUILD_COMMAND_TEST}}/g, 'npm run test')
        .replace(/{{LINT_COMMAND}}/g, 'npm run lint')
        .replace(/{{FORMAT_COMMAND}}/g, 'npx prettier --write .');
    } else {
      defaultAgents = `# AGENTS.md — Harness Platform\n\n> **Harness Version:** 4.0\n> **Purpose:** Operational Contract for all AI Agents contributing to this project.\n`;
    }
    fs.writeFileSync(agentsPath, defaultAgents, 'utf8');

    // Read repository map template
    const repoMapTemplatePath = path.resolve(__dirname, '../../../../src/shared/templates/REPOSITORY_MAP_TEMPLATE.md');
    let defaultRepoMap = '';
    
    if (fs.existsSync(repoMapTemplatePath)) {
      const templateContent = fs.readFileSync(repoMapTemplatePath, 'utf8');
      const projectName = path.basename(targetDir);
      
      const dirTree = buildTree(targetDir);
      const entryPoints = scanEntryPoints(targetDir);
      const keyFiles = scanKeyFiles(targetDir);

      defaultRepoMap = templateContent
        .replace(/{{PROJECT_NAME}}/g, projectName)
        .replace(/{{DIRECTORY_TREE}}/g, dirTree)
        .replace(/{{ENTRY_POINTS}}/g, entryPoints)
        .replace(/{{KEY_FILES}}/g, keyFiles);
    } else {
      defaultRepoMap = `# Bản đồ Thư mục Dự án (Repository Map)\n\n> **Dự án:** ${path.basename(targetDir)}\n`;
    }
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

function buildTree(dirPath: string, prefix = '', depth = 0, maxDepth = 2): string {
  if (depth > maxDepth) return '';
  let result = '';
  try {
    if (!fs.existsSync(dirPath)) return '';
    const items = fs.readdirSync(dirPath, { withFileTypes: true })
      .filter(item => item.name !== 'node_modules' && item.name !== '.git' && item.name !== '.harness' && !item.name.startsWith('.'))
      .sort((a, b) => {
        if (a.isDirectory() && !b.isDirectory()) return -1;
        if (!a.isDirectory() && b.isDirectory()) return 1;
        return a.name.localeCompare(b.name);
      });

    items.forEach((item, index) => {
      const isLast = index === items.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      const isDir = item.isDirectory();
      
      result += `${prefix}${connector}${item.name}${isDir ? '/' : ''}\n`;
      
      if (isDir) {
        const nextPrefix = prefix + (isLast ? '    ' : '│   ');
        result += buildTree(path.join(dirPath, item.name), nextPrefix, depth + 1, maxDepth);
      }
    });
  } catch {
    // ignore
  }
  return result;
}

function scanEntryPoints(dirPath: string): string {
  const possibleEntries = [
    'src/index.ts', 'src/main.ts', 'src/app.ts', 'src/index.js', 'src/main.js', 'src/app.js',
    'index.js', 'app.js', 'server.js', 'main.py', 'app.py', 'src/main.go', 'main.go',
    'AGENTS.md'
  ];
  
  const entries: string[] = [];
  possibleEntries.forEach(entry => {
    if (fs.existsSync(path.join(dirPath, entry))) {
      const desc = entry === 'AGENTS.md' ? 'Điểm khởi đầu cho các AI Agent' : 'Điểm khởi đầu chính của ứng dụng';
      entries.push(`- \`${entry}\` — ${desc}`);
    }
  });

  if (entries.length === 0) {
    entries.push('- N/A — Chưa phát hiện entry point cụ thể.');
  }
  return entries.join('\n');
}

function scanKeyFiles(dirPath: string): string {
  const possibleKeys = [
    '.harness/harness.yaml', 'package.json', 'tsconfig.json', 'requirements.txt',
    'Cargo.toml', 'go.mod', 'Gemfile', 'README.md', '.gitignore'
  ];

  const keys: string[] = [];
  possibleKeys.forEach(key => {
    if (fs.existsSync(path.join(dirPath, key))) {
      let desc = '';
      if (key === '.harness/harness.yaml') desc = 'Khai báo cấu hình dự án cho hệ thống Harness';
      else if (key === 'package.json') desc = 'Danh sách dependency và script thực thi của NodeJS';
      else if (key === 'tsconfig.json') desc = 'Cấu hình trình biên dịch TypeScript';
      else if (key === 'README.md') desc = 'Tài liệu hướng dẫn chung của dự án';
      else desc = 'Cấu hình hoặc tài liệu quan trọng của dự án';
      keys.push(`- \`${key}\` — ${desc}`);
    }
  });

  if (keys.length === 0) {
    keys.push('- N/A — Chưa phát hiện file cấu hình quan trọng.');
  }
  return keys.join('\n');
}
