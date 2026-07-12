import { ProposalId, ISO8601, AssetId } from './primitives';
import { ProposalStatus, ProposalType } from './enums';

export interface Evidence {
  id: string;
  type: 'execution_log' | 'test_result' | 'code_change' | 'human_observation';
  source: string;
  content: string;
  timestamp: ISO8601;
}

export interface Comment {
  id: string;
  author: string;
  content: string;
  timestamp: ISO8601;
}

export interface Proposal {
  id: ProposalId;
  title: string;
  description: string;
  type: ProposalType;
  status: ProposalStatus;
  targetAsset?: AssetId;
  proposedContent: string;
  rationale: string;
  evidence: Evidence[];
  author: string;
  reviewers: string[];
  createdAt: ISO8601;
  updatedAt: ISO8601;
  reviewedAt?: ISO8601;
  approvedAt?: ISO8601;
  promotedAt?: ISO8601;
  comments: Comment[];
  tags: string[];
}

export interface AuditRecord {
  id: string;
  timestamp: ISO8601;
  action: string;
  actor: string;
  proposalId: string;
  previousStatus?: ProposalStatus;
  newStatus?: ProposalStatus;
  details: string;
}

export interface ADR {
  id: string;
  title: string;
  status: 'proposed' | 'accepted' | 'deprecated' | 'superseded';
  context: string;
  decision: string;
  rationale: string;
  consequences: string;
  alternatives?: string;
  createdAt: ISO8601;
  updatedAt: ISO8601;
  supersededBy?: string;
}
