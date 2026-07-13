#!/usr/bin/env node
import { runInit } from './commands/init';
import { runValidate } from './commands/validate';
import { runStatus } from './commands/status';
import { runContext } from './commands/context';
import { runCapabilities } from './commands/capabilities';
import { runTask } from './commands/run';
import { runDoctor } from './commands/doctor';
import { runInstall } from './commands/install';
import { runUpdate } from './commands/update';
import { runSync } from './commands/sync';
import { runPublish } from './commands/publish';
import { runProposalList } from './commands/proposal/list';
import { runProposalSubmit } from './commands/proposal/submit';
import { runProposalApprove } from './commands/proposal/approve';
import { runProposalReject } from './commands/proposal/reject';
import { runProposalPromote } from './commands/proposal/promote';
import { runProposalRequestChanges } from './commands/proposal/request-changes';
import { runMcpServer } from './commands/mcp-server';
import { runConformance } from './commands/conformance';
import { runWorkflowList } from './commands/workflow/list';
import { runSkillList } from './commands/skill/list';
import { runSkillShow } from './commands/skill/show';
import { getPackageVersion } from '../../platform/service';

// Ctrl+C Handler
process.on('SIGINT', () => {
  console.error('\nInterrupted');
  process.exit(130);
});

const args = process.argv.slice(2);

const options: any = {
  verbose: args.includes('--verbose'),
  quiet: args.includes('--quiet') || args.includes('-q'),
  json: args.includes('--json'),
  noColor: args.includes('--no-color') || !!process.env.HARNESS_NO_COLOR,
  noBrainstorm: args.includes('--no-brainstorm'),
  dryRun: args.includes('--dry-run'),
  cwd: '',
  harnessHome: ''
};

const cwdIndex = args.indexOf('--cwd');
if (cwdIndex !== -1 && args[cwdIndex + 1]) {
  options.cwd = args[cwdIndex + 1];
}

const homeIndex = args.indexOf('--harness-home');
if (homeIndex !== -1 && args[homeIndex + 1]) {
  options.harnessHome = args[homeIndex + 1];
}

// Clean args of global options
const cleanArgs = args.filter((arg, idx) => {
  if (arg === '--verbose' || arg === '--quiet' || arg === '-q' || arg === '--json' || arg === '--no-color' || arg === '--no-brainstorm' || arg === '--dry-run') {
    return false;
  }
  if (arg === '--cwd' || (idx > 0 && args[idx - 1] === '--cwd')) {
    return false;
  }
  if (arg === '--harness-home' || (idx > 0 && args[idx - 1] === '--harness-home')) {
    return false;
  }
  return true;
});

const command = cleanArgs[0];

const helpText = `Harness Operator CLI
Usage:
  harness version
  harness help
  harness init [path]
  harness validate [path] [--strict]
  harness status [--json]
  harness doctor
  harness run "task description"
  harness install [source] [version]
  harness update [version] [--force]
  harness sync
  harness publish <asset-path>
  harness proposal list [--status status] [--type type]
  harness proposal submit <asset-id>
  harness proposal approve <proposal-id>
  harness workflow list
  harness skill list
  harness skill show <skill-id>
`;

if (command === 'version') {
  console.log(`harness v${getPackageVersion()} (spec 4.0)`);
  process.exit(0);
} else if (command === 'help' || args.includes('--help') || args.includes('-h')) {
  console.log(helpText);
  process.exit(0);
} else if (command === 'init') {
  const force = args.includes('--force');
  runInit(cleanArgs[1], { force });
} else if (command === 'validate') {
  const strict = args.includes('--strict');
  // Strict should be stripped out for target path extraction
  const pathArg = cleanArgs.slice(1).find(arg => arg !== '--strict');
  runValidate(pathArg, { strict, ...options });
} else if (command === 'status') {
  runStatus(options);
} else if (command === 'context') {
  const taskIndex = args.indexOf('--task');
  const task = taskIndex !== -1 && args[taskIndex + 1] ? args[taskIndex + 1] : 'default';
  const skills = args.includes('--skills');
  runContext({ task, skills, ...options });
} else if (command === 'capability' && cleanArgs[1] === 'list') {
  runCapabilities(options);
} else if (command === 'run') {
  const taskDesc = cleanArgs.slice(1).join(' ') || 'default description';
  runTask(taskDesc, options);
} else if (command === 'doctor') {
  runDoctor(options);
} else if (command === 'install') {
  const sourceIdx = args.indexOf('--source');
  const versionIdx = args.indexOf('--version');
  const source = sourceIdx !== -1 ? args[sourceIdx + 1] : (cleanArgs[1] || 'https://github.com/my-org/shared-harness.git');
  const version = versionIdx !== -1 ? args[versionIdx + 1] : cleanArgs[2];
  runInstall(source, version, options);
} else if (command === 'update') {
  const version = cleanArgs[1];
  const force = args.includes('--force');
  runUpdate(version, force, options);
} else if (command === 'sync') {
  runSync(options);
} else if (command === 'publish') {
  const assetPath = cleanArgs[1];
  if (!assetPath) {
    console.error('✗ Missing required argument: asset path');
    process.exit(2);
  }
  runPublish(assetPath, options);
} else if (command === 'mcp-server') {
  runMcpServer(options);
} else if (command === 'proposal') {
  const subCommand = cleanArgs[1];
  if (subCommand === 'list') {
    const statusIdx = args.indexOf('--status');
    const status = statusIdx !== -1 ? args[statusIdx + 1] : undefined;
    const typeIdx = args.indexOf('--type');
    const type = typeIdx !== -1 ? args[typeIdx + 1] : undefined;
    runProposalList({ status, type, ...options });
  } else if (subCommand === 'submit') {
    const id = cleanArgs[2];
    const fileIdx = args.indexOf('--file');
    const filePath = fileIdx !== -1 ? args[fileIdx + 1] : undefined;
    if (!id && !filePath) {
      console.error('✗ Provide either a proposal <id> or --file <path>');
      process.exit(2);
    }
    runProposalSubmit(id, { file: filePath, ...options });
  } else if (subCommand === 'approve') {
    const id = cleanArgs[2];
    if (!id) {
      console.error('✗ Missing required argument: proposal id');
      process.exit(2);
    }
    runProposalApprove(id, options);
  } else if (subCommand === 'reject') {
    const id = cleanArgs[2];
    if (!id) {
      console.error('✗ Missing required argument: proposal id');
      process.exit(2);
    }
    const commentsIdx = args.indexOf('--comments');
    const comments = commentsIdx !== -1 ? args[commentsIdx + 1] : undefined;
    runProposalReject(id, { comments, ...options });
  } else if (subCommand === 'promote') {
    const id = cleanArgs[2];
    if (!id) {
      console.error('✗ Missing required argument: proposal id');
      process.exit(2);
    }
    runProposalPromote(id, options);
  } else if (subCommand === 'request-changes') {
    const id = cleanArgs[2];
    if (!id) {
      console.error('✗ Missing required argument: proposal id');
      process.exit(2);
    }
    const commentsIdx = args.indexOf('--comments');
    const comments = commentsIdx !== -1 ? args[commentsIdx + 1] : undefined;
    runProposalRequestChanges(id, { comments, ...options });
  } else {
    console.error(`✗ Unknown proposal subcommand: ${subCommand}`);
    process.exit(2);
  }
} else if (command === 'conformance' && cleanArgs[1] === 'run') {
  runConformance(options);
} else if (command === 'workflow') {
  const subCommand = cleanArgs[1];
  if (subCommand === 'list') {
    runWorkflowList(options);
  } else {
    console.error(`✗ Unknown workflow subcommand: ${subCommand}`);
    process.exit(2);
  }
} else if (command === 'skill') {
  const subCommand = cleanArgs[1];
  if (subCommand === 'list') {
    runSkillList(options);
  } else if (subCommand === 'show') {
    const id = cleanArgs[2];
    runSkillShow(id, options);
  } else {
    console.error(`✗ Unknown skill subcommand: ${subCommand}`);
    process.exit(2);
  }
} else {
  console.log(helpText);
  process.exit(1);
}
