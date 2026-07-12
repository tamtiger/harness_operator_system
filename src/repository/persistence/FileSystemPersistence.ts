import * as fs from 'fs';
import * as path from 'path';
import { RepositoryRoot, RelativePath } from '../../shared/types/primitives';
import { repoError } from '../../shared/errors/factories';
import { isWithinBoundary } from '../../shared/utils/path';

export class FileSystemPersistence {
  write(root: RepositoryRoot, relativePath: RelativePath, content: string): void {
    if (relativePath.includes('..') || path.isAbsolute(relativePath)) {
      throw repoError('REPO_014', { details: `Path traversal detected: ${relativePath}` });
    }

    const absPath = path.resolve(root.path, '.harness', relativePath);
    if (!isWithinBoundary(root.path, path.relative(root.path, absPath))) {
      throw repoError('REPO_014', { details: `Path traversal detected: ${relativePath}` });
    }

    const parent = path.dirname(absPath);
    try {
      if (!fs.existsSync(parent)) {
        fs.mkdirSync(parent, { recursive: true });
      }
    } catch (e: any) {
      throw repoError('REPO_010', { details: `Failed to create directory: ${parent} - ${e.message}` });
    }

    // Atomic write protocol
    const tempFile = absPath + '.tmp.' + Math.random().toString(36).substring(2, 10);
    try {
      fs.writeFileSync(tempFile, content, 'utf8');
      
      // Verify write
      if (!fs.existsSync(tempFile) || fs.statSync(tempFile).size === 0) {
        throw new Error('Verification failed: temp file empty or missing');
      }

      fs.renameSync(tempFile, absPath);
    } catch (e: any) {
      if (fs.existsSync(tempFile)) {
        try { fs.unlinkSync(tempFile); } catch (e) { /* ignore */ }
      }
      throw repoError('REPO_015', { details: `Atomic write failed: ${e.message}` });
    }
  }

  read(root: RepositoryRoot, relativePath: RelativePath): string {
    if (relativePath.includes('..') || path.isAbsolute(relativePath)) {
      throw repoError('REPO_014', { details: `Path traversal detected: ${relativePath}` });
    }

    const absPath = path.resolve(root.path, '.harness', relativePath);
    if (!isWithinBoundary(root.path, path.relative(root.path, absPath))) {
      throw repoError('REPO_014', { details: `Path traversal detected: ${relativePath}` });
    }

    if (!fs.existsSync(absPath)) {
      throw repoError('REPO_010', { details: `File not found: ${relativePath}` });
    }

    try {
      return fs.readFileSync(absPath, 'utf8');
    } catch (e: any) {
      throw repoError('REPO_010', { details: `Read error: ${e.message}` });
    }
  }

  exists(absolutePath: string): boolean {
    return fs.existsSync(absolutePath);
  }
}
