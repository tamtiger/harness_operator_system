import { IKnowledgeEngine, IKnowledgeStore, KnowledgeItem, IFileSystem, IWorkspaceManager } from '@harness/contracts';
import * as path from 'path';

export class KnowledgeEngine implements IKnowledgeEngine {
  public readonly serviceName = 'KnowledgeEngine';

  constructor(
    private readonly store: IKnowledgeStore,
    private readonly fileSystem: IFileSystem,
    private readonly workspace: IWorkspaceManager
  ) {}

  public async initialize(): Promise<void> {
    const dbPath = path.join(this.workspace.getDatabaseDir(), 'knowledge.db');
    this.store.initializeStore(dbPath);
  }

  public async indexDocuments(): Promise<void> {
    this.store.clear();

    const workspaceRoot = this.workspace.getWorkspaceRoot();
    const items: KnowledgeItem[] = [];

    const docsDir = path.join(workspaceRoot, 'docs');
    if (await this.fileSystem.exists(docsDir)) {
      await this.scanDirForDocs(docsDir, items);
    }

    const adrDir = path.join(workspaceRoot, 'docs', 'decisions');
    if (await this.fileSystem.exists(adrDir)) {
      await this.scanDirForDocs(adrDir, items, 'adr');
    }

    if (items.length > 0) {
      this.store.saveItems(items);
    }
  }

  private async scanDirForDocs(dir: string, items: KnowledgeItem[], forceType?: string): Promise<void> {
    try {
      const files = await this.fileSystem.readDir(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        if (file.endsWith('.md')) {
          const content = await this.fileSystem.readFile(fullPath);
          const docItems = this.parseMarkdownSections(fullPath, content, forceType);
          items.push(...docItems);
        } else if (!file.startsWith('.')) {
          try {
            await this.fileSystem.readDir(fullPath);
            await this.scanDirForDocs(fullPath, items, forceType);
          } catch {}
        }
      }
    } catch {}
  }

  public parseMarkdownSections(filePath: string, content: string, forceType?: string): KnowledgeItem[] {
    const items: KnowledgeItem[] = [];
    const lines = content.split('\n');
    
    let currentTitle = path.basename(filePath, '.md');
    let currentContent: string[] = [];
    let sectionCount = 0;

    const saveSection = () => {
      const sectText = currentContent.join('\n').trim();
      if (sectText.length > 0) {
        const relPath = path.relative(this.workspace.getWorkspaceRoot(), filePath).replace(/\\/g, '/');
        const id = `${relPath}#section-${sectionCount++}`;
        const type = forceType || (relPath.includes('decisions/') ? 'adr' : 'doc');
        
        let tags: string[] = [];
        const tagsMatch = sectText.match(/tags:\s*\[(.*)\]/);
        if (tagsMatch) {
          tags = tagsMatch[1].split(',').map(t => t.trim().replace(/['"]/g, ''));
        }

        items.push({
          id,
          type,
          source: relPath,
          title: currentTitle,
          content: sectText,
          tags,
          updatedAt: new Date()
        });
      }
    };

    for (const line of lines) {
      if (line.startsWith('#') || line.startsWith('##') || line.startsWith('###')) {
        saveSection();
        currentTitle = line.replace(/^#+\s*/, '').trim();
        currentContent = [line];
      } else {
        currentContent.push(line);
      }
    }
    saveSection();

    return items;
  }

  public async search(query: string, limit: number = 5): Promise<KnowledgeItem[]> {
    const candidates = this.store.searchCandidates(query);
    if (candidates.length === 0) return [];

    const allItems = this.store.getItems();
    const N = allItems.length;
    
    const docTokenLists = allItems.map(item => this.tokenize(item.content));
    const avgDocLength = docTokenLists.reduce((sum, list) => sum + list.length, 0) / N;

    const df = new Map<string, number>();
    const queryTerms = this.tokenize(query);
    
    for (const term of queryTerms) {
      let count = 0;
      for (const tokens of docTokenLists) {
        if (tokens.includes(term)) {
          count++;
        }
      }
      df.set(term, count);
    }

    const scoredCandidates = candidates.map(candidate => {
      const tokens = this.tokenize(candidate.content);
      const docLen = tokens.length;
      let score = 0;

      const k1 = 1.2;
      const b = 0.75;

      for (const term of queryTerms) {
        const nQ = df.get(term) || 0;
        const idf = Math.log((N - nQ + 0.5) / (nQ + 0.5) + 1);
        const tf = tokens.filter(t => t === term).length;

        const termScore = idf * (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (docLen / avgDocLength)));
        score += termScore;
      }

      if (candidate.type === 'adr') score += 2.0;
      if (candidate.source.includes('architecture')) score += 1.5;

      return { item: candidate, score };
    });

    scoredCandidates.sort((a, b) => b.score - a.score);

    return scoredCandidates.slice(0, limit).map(sc => sc.item);
  }

  public async getById(id: string): Promise<KnowledgeItem | undefined> {
    return this.store.getItemById(id);
  }

  public async getByTag(tag: string): Promise<KnowledgeItem[]> {
    const all = this.store.getItems();
    return all.filter(item => item.tags.includes(tag));
  }

  private tokenize(text: string): string[] {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.trim().length > 0);
  }
}
