export enum AssetType {
  RULE = 'rule',
  PROMPT = 'prompt',
  TEMPLATE = 'template',
  WORKFLOW = 'workflow',
  KNOWLEDGE = 'knowledge',
  HOOK = 'hook',
  CAPABILITY = 'capability',
  SKILL = 'skill'
}

export enum AssetScope {
  SHARED = 'shared',
  LOCAL = 'local'
}

export enum AssetStatus {
  DRAFT = 'draft',
  REVIEW = 'review',
  APPROVED = 'approved',
  PUBLISHED = 'published',
  DEPRECATED = 'deprecated',
  RETIRED = 'retired'
}

export enum AssetPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export enum TaskStatus {
  CREATED = 'CREATED',
  PLANNING = 'PLANNING',
  RUNNING = 'RUNNING',
  VERIFYING = 'VERIFYING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

export enum ProposalStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  REVIEWING = 'REVIEWING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PROMOTED = 'PROMOTED',
  CANCELLED = 'CANCELLED'
}

export enum ProposalType {
  NEW_ASSET = 'new_asset',
  UPDATE_ASSET = 'update_asset',
  DELETE_ASSET = 'delete_asset',
  PROMOTE_TO_SHARED = 'promote_to_shared'
}

export enum HookEvent {
  PRE_EXECUTION = 'pre_execution',
  POST_EXECUTION = 'post_execution',
  PRE_COMMIT = 'pre_commit',
  POST_COMMIT = 'post_commit'
}

export enum Permission {
  READ_FILE = 'read_file',
  WRITE_FILE = 'write_file',
  EXECUTE_COMMAND = 'execute_command',
  NETWORK_ACCESS = 'network_access',
  GIT_READ = 'git_read',
  GIT_WRITE = 'git_write',
  HARNESS_READ = 'harness_read',
  HARNESS_WRITE = 'harness_write',
  PROPOSAL_CREATE = 'proposal_create',
  PROPOSAL_APPROVE = 'proposal_approve'
}

export enum ErrorDomain {
  REPOSITORY = 'REPOSITORY',
  CONTEXT = 'CONTEXT',
  EXECUTION = 'EXECUTION',
  CAPABILITY = 'CAPABILITY',
  GOVERNANCE = 'GOVERNANCE',
  PLATFORM = 'PLATFORM',
  MANIFEST = 'MANIFEST'
}
