import { CapabilityRegistry, type FileSystemOps } from '../../shared/contracts/services';

// Import definitions and capabilities
import {
  fileReadDef, FileReadCapability,
  fileWriteDef, FileWriteCapability,
  fileAppendDef, FileAppendCapability,
  fileDeleteDef, FileDeleteCapability,
  fileExistsDef, FileExistsCapability,
  fileListDef, FileListCapability,
  fileMoveDef, FileMoveCapability,
  fileCopyDef, FileCopyCapability,
  dirCreateDef, DirCreateCapability,
  dirDeleteDef, DirDeleteCapability,
  dirListDef, DirListCapability,
  dirExistsDef, DirExistsCapability
} from './fileOps';

import {
  searchTextDef, SearchTextCapability,
  searchFileDef, SearchFileCapability,
  searchSymbolDef, SearchSymbolCapability
} from './searchOps';

import {
  gitStatusDef, GitStatusCapability,
  gitDiffDef, GitDiffCapability,
  gitCommitDef, GitCommitCapability,
  gitLogDef, GitLogCapability,
  gitBranchDef, GitBranchCapability,
  gitCheckoutDef, GitCheckoutCapability
} from './gitOps';

import {
  termExecuteDef, TermExecuteCapability,
  termStreamDef, TermStreamCapability
} from './termOps';

import {
  aiCompleteDef, AICompleteCapability,
  aiEmbedDef, AIEmbedCapability,
  aiSubagentDef, AISubagentCapability
} from './aiOps';

import {
  repoReadAssetDef, RepoReadAssetCapability,
  repoCreateProposalDef, RepoCreateProposalCapability
} from './repoOps';

export interface BuiltinDeps {
  persistence: FileSystemOps;
  repositoryService?: any;
  governanceService?: any;
}

export function registerBuiltins(registry: CapabilityRegistry, deps: BuiltinDeps): void {
  // File Ops
  registry.register(fileReadDef, new FileReadCapability(deps.persistence));
  registry.register(fileWriteDef, new FileWriteCapability(deps.persistence));
  registry.register(fileAppendDef, new FileAppendCapability(deps.persistence));
  registry.register(fileDeleteDef, new FileDeleteCapability(deps.persistence));
  registry.register(fileExistsDef, new FileExistsCapability(deps.persistence));
  registry.register(fileListDef, new FileListCapability(deps.persistence));
  registry.register(fileMoveDef, new FileMoveCapability(deps.persistence));
  registry.register(fileCopyDef, new FileCopyCapability(deps.persistence));

  // Dir Ops
  registry.register(dirCreateDef, new DirCreateCapability(deps.persistence));
  registry.register(dirDeleteDef, new DirDeleteCapability(deps.persistence));
  registry.register(dirListDef, new DirListCapability(deps.persistence));
  registry.register(dirExistsDef, new DirExistsCapability(deps.persistence));

  // Search Ops
  registry.register(searchTextDef, new SearchTextCapability());
  registry.register(searchFileDef, new SearchFileCapability());
  registry.register(searchSymbolDef, new SearchSymbolCapability());

  // Git Ops
  registry.register(gitStatusDef, new GitStatusCapability());
  registry.register(gitDiffDef, new GitDiffCapability());
  registry.register(gitCommitDef, new GitCommitCapability());
  registry.register(gitLogDef, new GitLogCapability());
  registry.register(gitBranchDef, new GitBranchCapability());
  registry.register(gitCheckoutDef, new GitCheckoutCapability());

  // Terminal Ops
  registry.register(termExecuteDef, new TermExecuteCapability());
  registry.register(termStreamDef, new TermStreamCapability());

  // AI Ops
  registry.register(aiCompleteDef, new AICompleteCapability());
  registry.register(aiEmbedDef, new AIEmbedCapability());
  registry.register(aiSubagentDef, new AISubagentCapability());

  // Repo Ops
  registry.register(repoReadAssetDef, new RepoReadAssetCapability());
  registry.register(repoCreateProposalDef, new RepoCreateProposalCapability());
}
