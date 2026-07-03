import { IFileSystem } from '@harness/contracts';
import * as fs from 'fs/promises';
import * as path from 'path';

export class PhysicalFileSystem implements IFileSystem {
  public async exists(targetPath: string): Promise<boolean> {
    try {
      await fs.access(targetPath);
      return true;
    } catch {
      return false;
    }
  }

  public async readFile(targetPath: string, encoding: string = 'utf-8'): Promise<string> {
    return fs.readFile(targetPath, { encoding: encoding as BufferEncoding });
  }

  public async writeFile(targetPath: string, content: string): Promise<void> {
    const dir = path.dirname(targetPath);
    await this.mkdir(dir);
    await fs.writeFile(targetPath, content, 'utf-8');
  }

  public async mkdir(targetPath: string): Promise<void> {
    await fs.mkdir(targetPath, { recursive: true });
  }

  public async readDir(targetPath: string): Promise<string[]> {
    return fs.readdir(targetPath);
  }

  public async remove(targetPath: string): Promise<void> {
    await fs.rm(targetPath, { recursive: true, force: true });
  }
}
