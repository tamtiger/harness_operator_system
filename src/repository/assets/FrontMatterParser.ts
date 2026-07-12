import * as yaml from 'js-yaml';
import { repoError } from '../../shared/errors/factories';

export class FrontMatterParser {
  parse(filePath: string, content: string): { metadata: any; body: string } {
    if (filePath.endsWith('.md')) {
      const match = content.match(/^---\r?\n([\s\S]+?)\r?\n---(?:\r?\n|$)/);
      if (!match) {
        throw repoError('REPO_005', { path: filePath, details: 'Missing frontmatter block' });
      }
      try {
        const metadata = yaml.load(match[1]);
        const body = content.substring(match[0].length);
        return { metadata, body };
      } catch (e: any) {
        throw repoError('REPO_005', { path: filePath, details: `Frontmatter YAML parse failed: ${e.message}` });
      }
    } else if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
      try {
        const parsed = yaml.load(content);
        return { metadata: parsed, body: content };
      } catch (e: any) {
        throw repoError('REPO_005', { path: filePath, details: `YAML parse failed: ${e.message}` });
      }
    } else {
      throw repoError('REPO_005', { path: filePath, details: `Unsupported file extension` });
    }
  }
}
