/**
 * Core Primitives used throughout the Harness system.
 */

export interface RepositoryRoot {
  path: string;
  hasGit: boolean;
  discoveredAt: string;
}
export type RelativePath = string;     // relative to RepositoryRoot
export type SemVer = string;           // "X.Y.Z"
export type ISO8601 = string;          // "2026-07-11T16:58:00Z"
export type CapabilityId = string;     // "namespace.name"
export type AssetId = string;          // "{scope}.{type}.{id}"
export type ProposalId = string;       // "PROP-YYYY-MM-DD-NNN"
export type Duration = number;         // milliseconds
export type JSONSchema = object;       // JSON Schema draft-07
export type CacheKey = string;
