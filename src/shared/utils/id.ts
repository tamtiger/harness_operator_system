import * as crypto from 'crypto';
import { ProposalId } from '../types/primitives';

export function generateProposalId(): ProposalId {
  const date = new Date();
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const randomNum = String(crypto.randomInt(0, 99999)).padStart(5, '0');
  return `PROP-${year}-${month}-${day}-${randomNum}`;
}

export function validateCapabilityId(id: string): boolean {
  return /^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+$/.test(id);
}

export function validateAssetId(id: string): boolean {
  return /^(shared|local)\.\w+\.\S+$/.test(id);
}
