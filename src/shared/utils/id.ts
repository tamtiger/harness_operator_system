import { ProposalId } from '../types/primitives';

export function generateProposalId(): ProposalId {
  const date = new Date();
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const randomNum = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  return `PROP-${year}-${month}-${day}-${randomNum}`;
}

export function validateCapabilityId(id: string): boolean {
  return /^\w+(?:\.\w+)+$/.test(id);
}

export function validateAssetId(id: string): boolean {
  return /^(shared|local)\.\w+\.\S+$/.test(id);
}
