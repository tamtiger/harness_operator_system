#!/usr/bin/env node
import { runInit } from './commands/init';
import { runValidate } from './commands/validate';
import { runStatus } from './commands/status';
import { runContext } from './commands/context';

const args = process.argv.slice(2);
const command = args[0];

if (command === 'init') {
  const force = args.includes('--force');
  const targetPath = args.slice(1).find(arg => !arg.startsWith('-'));
  runInit(targetPath, { force });
} else if (command === 'validate') {
  const strict = args.includes('--strict');
  const targetPath = args.slice(1).find(arg => !arg.startsWith('-'));
  runValidate(targetPath, { strict });
} else if (command === 'status') {
  const json = args.includes('--json');
  runStatus({ json });
} else if (command === 'context') {
  const taskIndex = args.indexOf('--task');
  const task = taskIndex !== -1 && args[taskIndex + 1] ? args[taskIndex + 1] : 'default';
  runContext({ task });
} else {
  console.log(`Harness Operator CLI
Usage:
  harness init [path] [--force]
  harness validate [path] [--strict]
  harness status [--json]
  harness context --task "task description"
`);
  process.exit(1);
}
