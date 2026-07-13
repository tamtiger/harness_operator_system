#!/usr/bin/env node
/**
 * render-graphs.js — Visualize skill flowcharts as SVG
 * Usage: node render-graphs.js <skill-file.md> [output-dir]
 *
 * Reads a skill markdown file, extracts mermaid code blocks,
 * and renders them as SVG files using the mermaid CLI.
 * If mermaid CLI is not available, prints instructions.
 *
 * Output: <skill-name>-<graph-index>.svg in output-dir (default: ./graphs/)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const inputFile = process.argv[2];
const outputDir = process.argv[3] || './graphs';

if (!inputFile) {
  console.error('Usage: node render-graphs.js <skill-file.md> [output-dir]');
  process.exit(1);
}

if (!fs.existsSync(inputFile)) {
  console.error(`Error: File not found: ${inputFile}`);
  process.exit(1);
}

const content = fs.readFileSync(inputFile, 'utf8');
const mermaidBlocks = [];
const mermaidRegex = /```mermaid\n([\s\S]*?)```/g;
let match;

while ((match = mermaidRegex.exec(content)) !== null) {
  mermaidBlocks.push(match[1].trim());
}

if (mermaidBlocks.length === 0) {
  console.log('No mermaid diagrams found in', inputFile);
  process.exit(0);
}

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const baseName = path.basename(inputFile, '.md');

// Check for mermaid CLI
let hasMermaidCli = false;
try {
  execSync('npx @mermaid-js/mermaid-cli --version', { stdio: 'pipe' });
  hasMermaidCli = true;
} catch {
  hasMermaidCli = false;
}

if (hasMermaidCli) {
  for (let i = 0; i < mermaidBlocks.length; i++) {
    const mmdFile = path.join(outputDir, `${baseName}-${i}.mmd`);
    const svgFile = path.join(outputDir, `${baseName}-${i}.svg`);
    fs.writeFileSync(mmdFile, mermaidBlocks[i], 'utf8');
    try {
      execSync(`npx mmdc -i "${mmdFile}" -o "${svgFile}"`, { stdio: 'pipe' });
      console.log(`Rendered: ${svgFile}`);
    } catch (err) {
      console.error(`Failed to render diagram ${i}:`, err.message);
    }
  }
} else {
  console.log(`Found ${mermaidBlocks.length} mermaid diagram(s) in ${inputFile}.`);
  console.log('To render as SVG, install @mermaid-js/mermaid-cli:');
  console.log('  npm install -g @mermaid-js/mermaid-cli');
  console.log('');
  console.log('Extracted diagrams saved as .mmd files in', outputDir);
  for (let i = 0; i < mermaidBlocks.length; i++) {
    const mmdFile = path.join(outputDir, `${baseName}-${i}.mmd`);
    fs.writeFileSync(mmdFile, mermaidBlocks[i], 'utf8');
    console.log(`  ${mmdFile}`);
  }
}
