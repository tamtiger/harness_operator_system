import { AssetMetadata } from '../../shared/types/assets';
import { AssetType, AssetScope } from '../../shared/types/enums';
import { repoError } from '../../shared/errors/factories';

export class AssetValidator {
  validate(raw: any, filePath: string): AssetMetadata {
    if (!raw) {
      throw repoError('REPO_007', { path: filePath, details: 'Metadata is empty' });
    }

    const required = ['id', 'type', 'version', 'name', 'scope'];
    for (const field of required) {
      if (raw[field] === undefined || raw[field] === null || raw[field] === '') {
        throw repoError('REPO_007', { path: filePath, details: `Missing required field: ${field}` });
      }
    }

    // Check type is valid AssetType
    const validTypes = Object.values(AssetType);
    if (!validTypes.includes(raw.type)) {
      throw repoError('REPO_007', { path: filePath, details: `Invalid AssetType: ${raw.type}` });
    }

    // Check scope is valid AssetScope
    const validScopes = Object.values(AssetScope);
    if (!validScopes.includes(raw.scope)) {
      throw repoError('REPO_007', { path: filePath, details: `Invalid AssetScope: ${raw.scope}` });
    }

    // Check version matches SemVer
    if (!/^\d+\.\d+\.\d+$/.test(raw.version)) {
      throw repoError('REPO_007', { path: filePath, details: `Invalid SemVer version: ${raw.version}` });
    }

    // Validate deprecated and supersededBy consistency
    if (raw.deprecated === true && raw.supersededBy) {
      if (typeof raw.supersededBy !== 'string' || raw.supersededBy.trim() === '') {
        throw repoError('REPO_007', { path: filePath, details: 'supersededBy must be a non-empty string when deprecated is true' });
      }
    }

    // Validate dates if present
    if (raw.createdAt && isNaN(Date.parse(raw.createdAt))) {
      throw repoError('REPO_007', { path: filePath, details: `Invalid createdAt date: ${raw.createdAt}` });
    }
    if (raw.updatedAt && isNaN(Date.parse(raw.updatedAt))) {
      throw repoError('REPO_007', { path: filePath, details: `Invalid updatedAt date: ${raw.updatedAt}` });
    }

    // Validate tags if present
    if (raw.tags !== undefined && !Array.isArray(raw.tags)) {
      throw repoError('REPO_007', { path: filePath, details: 'Tags must be an array of strings' });
    }
    if (Array.isArray(raw.tags)) {
      for (const tag of raw.tags) {
        if (typeof tag !== 'string') {
          throw repoError('REPO_007', { path: filePath, details: `Invalid tag type: expected string, got ${typeof tag}` });
        }
        if (tag.startsWith('id:') || tag.startsWith('prop:')) {
          throw repoError('REPO_007', { path: filePath, details: `Tag uses reserved prefix: ${tag}` });
        }
      }
    }

    return {
      id: raw.id,
      type: raw.type,
      version: raw.version,
      name: raw.name,
      description: raw.description,
      scope: raw.scope,
      source: raw.source || filePath,
      createdAt: raw.createdAt || new Date().toISOString(),
      updatedAt: raw.updatedAt || new Date().toISOString(),
      tags: raw.tags,
      deprecated: raw.deprecated,
      supersededBy: raw.supersededBy
    };
  }
}
