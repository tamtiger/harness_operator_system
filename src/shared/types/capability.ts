import { CapabilityId } from './primitives';
import { HarnessError } from '../errors/HarnessError';

export interface CapabilityInput {
  [key: string]: unknown;
}

export interface CapabilityResult {
  capabilityId: CapabilityId;
  success: boolean;
  output?: unknown;
  error?: HarnessError;
  durationMs: number;
}
