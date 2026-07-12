import * as fs from 'fs';
import * as path from 'path';
import { Manifest } from '../../shared/types/repository';
import { ManifestSchema } from './manifest-schema';
import { mftError } from '../../shared/errors/factories';

export class ManifestValidator {
  validate(raw: unknown, rootPath: string): Manifest {
    // 1. Zod parse validation
    const result = ManifestSchema.safeParse(raw);
    if (!result.success) {
      const issue = result.error.issues[0];
      const field = issue.path.join('.');
      
      if (field === 'version') {
        throw mftError('MFT_004', { details: `Unsupported version: ${(issue as any).received || 'unknown'}` });
      }
      if (field === 'specification') {
        throw mftError('MFT_005', { details: `Specification mismatch: ${(issue as any).received || 'unknown'}` });
      }
      if (issue.code === 'unrecognized_keys') {
        throw mftError('MFT_012', { details: `Custom field outside vendor: ${(issue as any).keys.join(', ')}` });
      }
      
      throw mftError('MFT_003', { details: `Missing or invalid field: ${field} - ${issue.message}` });
    }

    const manifest = result.data as Manifest;

    // 2. Validate repository.root path
    // The spec says: repository.root must be relative path and exist
    // However, the manifest itself contains repository.root.
    // If it is relative, it is resolved against rootPath.
    const repoRootAbs = path.resolve(rootPath, manifest.repository.root);
    if (!fs.existsSync(repoRootAbs)) {
      throw mftError('MFT_006', { details: `repository.root path not found: ${manifest.repository.root}` });
    }

    // 3. Validate agent.entry_point file exists
    const entryPointAbs = path.resolve(repoRootAbs, manifest.agent.entry_point);
    if (!fs.existsSync(entryPointAbs) || !fs.statSync(entryPointAbs).isFile()) {
      throw mftError('MFT_007', { details: `agent.entry_point missing: ${manifest.agent.entry_point}` });
    }

    // 4. Validate artifacts[].path exists
    if (manifest.artifacts) {
      for (const artifact of manifest.artifacts) {
        const artifactAbs = path.resolve(repoRootAbs, artifact.path);
        if (!fs.existsSync(artifactAbs)) {
          throw mftError('MFT_006', { details: `artifact path not found: ${artifact.path}` });
        }
      }
    }

    // 5. Source IDs unique
    if (manifest.sources) {
      const sourceIds = new Set<string>();
      for (const source of manifest.sources) {
        if (sourceIds.has(source.id)) {
          throw mftError('MFT_008', { details: `Duplicate source ID: ${source.id}` });
        }
        sourceIds.add(source.id);
      }
    }

    // 6. Capability IDs format validation namespace.name
    if (manifest.capabilities) {
      for (const cap of manifest.capabilities) {
        // Regex: /^\w+(?:\.\w+)+$/ (namespace.name structure)
        if (!/^\w+(?:\.\w+)+$/.test(cap.id)) {
          throw mftError('MFT_016', { details: `Invalid capability ID format: ${cap.id}` });
        }
      }
    }

    return manifest;
  }
}
