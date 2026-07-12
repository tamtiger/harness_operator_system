import { Proposal } from '../../shared/types/governance';

export function serializeProposal(p: Proposal): string {
  const frontmatter = {
    id: p.id,
    title: p.title,
    type: p.type,
    status: p.status,
    author: p.author,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    targetAsset: p.targetAsset || '',
    reviewers: p.reviewers.join(','),
    lockedBy: (p as any).lockedBy || '',
    lockedAt: (p as any).lockedAt || '',
    approvedAt: p.approvedAt || '',
    promotedAt: p.promotedAt || '',
    tags: p.tags.join(',')
  };

  const yamlLines = Object.entries(frontmatter)
    .map(([key, val]) => `${key}: ${JSON.stringify(val)}`)
    .join('\n');

  return `---
${yamlLines}
---

## Description
${p.description}

## Rationale
${p.rationale}

## Evidence
${JSON.stringify(p.evidence, null, 2)}

## Comments
${JSON.stringify(p.comments, null, 2)}

## Proposed Content
\`\`\`yaml
${p.proposedContent}
\`\`\`
`;
}

export function deserializeProposal(content: string): Proposal {
  const parts = content.split('---');
  if (parts.length < 3) {
    throw new Error('Invalid proposal file format');
  }
  const yamlText = parts[1];
  const bodyText = parts.slice(2).join('---');

  const frontmatter: any = {};
  yamlText.split('\n').forEach(line => {
    const idx = line.indexOf(':');
    if (idx !== -1) {
      const key = line.substring(0, idx).trim();
      const valText = line.substring(idx + 1).trim();
      try {
        frontmatter[key] = JSON.parse(valText);
      } catch (e) {
        frontmatter[key] = valText.replace(/^["']|["']$/g, '').trim();
      }
    }
  });

  const descriptionMatch = bodyText.match(/## Description\n([\s\S]*?)(?=\n## Rationale|$)/);
  const rationaleMatch = bodyText.match(/## Rationale\n([\s\S]*?)(?=\n## Evidence|$)/);
  const evidenceMatch = bodyText.match(/## Evidence\n([\s\S]*?)(?=\n## Comments|$)/);
  const commentsMatch = bodyText.match(/## Comments\n([\s\S]*?)(?=\n## Proposed Content|$)/);
  const proposedMatch = bodyText.match(/## Proposed Content\n```yaml\n([\s\S]*?)\n```[\s\S]*/);

  const description = descriptionMatch ? descriptionMatch[1].trim() : '';
  const rationale = rationaleMatch ? rationaleMatch[1].trim() : '';
  
  let evidence: any[] = [];
  if (evidenceMatch) {
    try {
      evidence = JSON.parse(evidenceMatch[1].trim());
    } catch (e) {
      // fallback
    }
  }

  let comments: any[] = [];
  if (commentsMatch) {
    try {
      comments = JSON.parse(commentsMatch[1].trim());
    } catch (e) {
      // fallback
    }
  }

  const proposedContent = proposedMatch ? proposedMatch[1].trim() : '';

  const reviewers = frontmatter.reviewers ? frontmatter.reviewers.split(',').filter(Boolean) : [];
  const tags = frontmatter.tags ? frontmatter.tags.split(',').filter(Boolean) : [];

  const prop: Proposal = {
    id: frontmatter.id,
    title: frontmatter.title,
    description,
    type: frontmatter.type,
    status: frontmatter.status,
    targetAsset: frontmatter.targetAsset || undefined,
    proposedContent,
    rationale,
    evidence,
    author: frontmatter.author,
    reviewers,
    createdAt: frontmatter.createdAt,
    updatedAt: frontmatter.updatedAt,
    comments,
    tags
  };

  if (frontmatter.approvedAt) {
    prop.approvedAt = frontmatter.approvedAt;
  }
  if (frontmatter.promotedAt) {
    prop.promotedAt = frontmatter.promotedAt;
  }
  if (frontmatter.lockedBy) {
    (prop as any).lockedBy = frontmatter.lockedBy;
  }
  if (frontmatter.lockedAt) {
    (prop as any).lockedAt = frontmatter.lockedAt;
  }

  return prop;
}
