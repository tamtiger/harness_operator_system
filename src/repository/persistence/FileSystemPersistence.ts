import * as fs from 'fs';
import * as path from 'path';
import { RelativePath } from '../../shared/types/primitives';
import { RepositoryRoot } from '../../shared/types/repository';
import { repoError } from '../../shared/errors/factories';
import { isWithinBoundary } from '../../shared/utils/path';

export interface DirEntry {
  name: string;
  type: 'file' | 'dir';
}

export interface FileStat {
  size: number;
  isFile: boolean;
  isDirectory: boolean;
  createdAt: Date;
  modifiedAt: Date;
}

export class FileSystemPersistence {
  private resolve(root: RepositoryRoot, relativePath: RelativePath): string {
    if (relativePath.includes('..') || path.isAbsolute(relativePath)) {
      throw repoError('REPO_014', { details: `Path traversal detected: ${relativePath}` });
    }
    const absPath = path.resolve(root.path, relativePath);
    if (!isWithinBoundary(root.path, path.relative(root.path, absPath))) {
      throw repoError('REPO_014', { details: `Path traversal detected: ${relativePath}` });
    }
    return absPath;
  }

  write(root: RepositoryRoot, relativePath: RelativePath, content: string): void {
    const absPath = this.resolve(root, relativePath);
    const parent = path.dirname(absPath);
    try {
      if (!fs.existsSync(parent)) {
        fs.mkdirSync(parent, { recursive: true });
      }
    } catch (e: any) {
      throw repoError('REPO_010', { details: `Failed to create directory: ${parent} - ${e.message}` });
    }

    const tempFile = absPath + '.tmp.' + Math.random().toString(36).substring(2, 10);
    try {
      fs.writeFileSync(tempFile, content, 'utf8');
      if (!fs.existsSync(tempFile) || fs.statSync(tempFile).size === 0) {
        throw new Error('Verification failed: temp file empty or missing');
      }
      // Ensure data is flushed to disk before rename (crash-safe)
      try {
        const fd = fs.openSync(tempFile, 'r+');
        fs.fsyncSync(fd);
        fs.closeSync(fd);
      } catch {
        // fsync may fail on some platforms (e.g., Windows tmpfs); continue regardless
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
    const absPath = this.resolve(root, relativePath);
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

  existsFile(root: RepositoryRoot, relativePath: RelativePath): boolean {
    const absPath = this.resolve(root, relativePath);
    return fs.existsSync(absPath) && fs.statSync(absPath).isFile();
  }

  existsDir(root: RepositoryRoot, relativePath: RelativePath): boolean {
    const absPath = this.resolve(root, relativePath);
    return fs.existsSync(absPath) && fs.statSync(absPath).isDirectory();
  }

  deleteFile(root: RepositoryRoot, relativePath: RelativePath): void {
    const absPath = this.resolve(root, relativePath);
    if (fs.existsSync(absPath)) {
      fs.unlinkSync(absPath);
    }
  }

  moveFile(root: RepositoryRoot, srcRelative: RelativePath, destRelative: RelativePath): void {
    const absSrc = this.resolve(root, srcRelative);
    const absDest = this.resolve(root, destRelative);
    if (fs.existsSync(absSrc)) {
      const parent = path.dirname(absDest);
      if (!fs.existsSync(parent)) {
        fs.mkdirSync(parent, { recursive: true });
      }
      fs.renameSync(absSrc, absDest);
    }
  }

  copyFile(root: RepositoryRoot, srcRelative: RelativePath, destRelative: RelativePath): void {
    const absSrc = this.resolve(root, srcRelative);
    const absDest = this.resolve(root, destRelative);
    if (fs.existsSync(absSrc)) {
      const parent = path.dirname(absDest);
      if (!fs.existsSync(parent)) {
        fs.mkdirSync(parent, { recursive: true });
      }
      fs.copyFileSync(absSrc, absDest);
    }
  }

  listDir(root: RepositoryRoot, relativePath: RelativePath): DirEntry[] {
    const absPath = this.resolve(root, relativePath);
    if (!fs.existsSync(absPath) || !fs.statSync(absPath).isDirectory()) {
      return [];
    }
    return fs.readdirSync(absPath).sort().map(name => {
      const stats = fs.statSync(path.join(absPath, name));
      return { name, type: stats.isDirectory() ? 'dir' : 'file' };
    });
  }

  statFile(root: RepositoryRoot, relativePath: RelativePath): FileStat {
    const absPath = this.resolve(root, relativePath);
    const stats = fs.statSync(absPath);
    return {
      size: stats.size,
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime
    };
  }

  mkDir(root: RepositoryRoot, relativePath: RelativePath, recursive: boolean = true): void {
    const absPath = this.resolve(root, relativePath);
    fs.mkdirSync(absPath, { recursive });
  }

  rmDir(root: RepositoryRoot, relativePath: RelativePath, recursive: boolean = true): void {
    const absPath = this.resolve(root, relativePath);
    if (fs.existsSync(absPath)) {
      fs.rmSync(absPath, { recursive, force: true });
    }
  }
}
