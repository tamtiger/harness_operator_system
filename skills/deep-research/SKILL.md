---
name: deep-research
description: "Structured research with source validation, synthesis, and evidence-based decision making."
metadata:
  version: "1.0"
  updated: "2026-05-29"
  applies_to: ["*"]
  triggers: ["session_start"]
---

# Deep Research Skill

## Overview

Deep research is systematic investigation with evidence validation. This skill teaches how to gather information, validate sources, synthesize findings, and make evidence-based decisions.

The key insight: **not all sources are equal**. A peer-reviewed paper is more reliable than a blog post. A primary source is more reliable than a summary. Consensus across multiple sources is more reliable than a single source.

## Research Workflow

```
┌─────────────────────────────────────────────────────┐
│ 1. Define Research Question                         │
│    - What do we need to know?                       │
│    - Why do we need to know it?                     │
│    - What would change our decision?                │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│ 2. Gather Sources                                   │
│    - Search multiple channels                       │
│    - Collect diverse perspectives                   │
│    - Document source URLs                           │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│ 3. Validate Sources                                 │
│    - Check author credentials                       │
│    - Verify publication date                        │
│    - Assess bias and conflicts of interest          │
│    - Cross-reference with other sources             │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│ 4. Extract Key Findings                             │
│    - Identify claims and evidence                   │
│    - Note disagreements between sources             │
│    - Highlight consensus                            │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│ 5. Synthesize Conclusions                           │
│    - Integrate findings into coherent narrative     │
│    - Identify gaps and uncertainties                │
│    - Recommend next steps                           │
└─────────────────────────────────────────────────────┘
```

## Step 1: Define Research Question

Start with a clear question:

**Good questions:**
- "What are the performance tradeoffs between PostgreSQL and MongoDB for our use case?"
- "How do other teams handle authentication in microservices?"
- "What's the current best practice for error handling in async code?"

**Bad questions:**
- "Tell me about databases" (too broad)
- "Is PostgreSQL good?" (too vague)
- "What should we use?" (not a research question, a decision)

**Research question template:**
```
For [context], what is [topic], and how does it compare to [alternative]?

Example:
For a real-time chat application, what is the latency of WebSocket vs polling,
and how does it compare to gRPC?
```

## Step 2: Gather Sources

Search multiple channels:

**Primary sources:**
- Official documentation (PostgreSQL docs, Node.js docs)
- Academic papers (IEEE, ACM)
- RFCs (Request for Comments)
- Source code (GitHub, GitLab)

**Secondary sources:**
- Technical blogs (Martin Fowler, High Scalability)
- Conference talks (YouTube, InfoQ)
- Books (O'Reilly, Pragmatic Programmer)
- Stack Overflow (community consensus)

**Tertiary sources:**
- Wikipedia (overview, not authoritative)
- News articles (context, not technical details)
- Social media (opinions, not facts)

**Search strategy:**
```
1. Start with official documentation
2. Search for "[topic] best practices"
3. Search for "[topic] vs [alternative]"
4. Search for "[topic] performance"
5. Search for "[topic] pitfalls"
6. Search for recent conference talks
7. Check GitHub issues and discussions
```

## Step 3: Validate Sources

For each source, assess credibility:

**Author credentials:**
- Is the author an expert in the field?
- Do they work for a relevant company?
- Have they published other credible work?
- Any conflicts of interest?

**Publication venue:**
- Is it peer-reviewed?
- Is it from a reputable publisher?
- Is it an official source?
- Is it a personal blog?

**Publication date:**
- Is it recent (within 2 years)?
- Has the field changed since publication?
- Are there newer sources?

**Evidence quality:**
- Does the source cite other sources?
- Are claims backed by data?
- Are benchmarks reproducible?
- Are limitations acknowledged?

**Source reliability matrix:**

| Source Type | Reliability | Notes |
|---|---|---|
| Official documentation | ⭐⭐⭐⭐⭐ | Authoritative, maintained |
| Peer-reviewed paper | ⭐⭐⭐⭐⭐ | Vetted by experts |
| RFC | ⭐⭐⭐⭐⭐ | Standard specification |
| Conference talk (reputable) | ⭐⭐⭐⭐ | Expert opinion, vetted |
| Technical blog (established author) | ⭐⭐⭐ | Opinion, may be outdated |
| Stack Overflow (high votes) | ⭐⭐⭐ | Community consensus |
| Random blog | ⭐⭐ | Unvetted, may be wrong |
| Social media | ⭐ | Opinions, not facts |

## Step 4: Extract Key Findings

For each source, extract:

**Claims:** What does the source assert?
```
"PostgreSQL is better for ACID compliance than MongoDB"
```

**Evidence:** What data supports the claim?
```
"PostgreSQL enforces ACID transactions at the database level.
MongoDB added multi-document ACID transactions in version 4.0."
```

**Limitations:** What are the caveats?
```
"This comparison is from 2019 and may not reflect current versions."
```

**Disagreements:** Where do sources conflict?
```
Source A: "MongoDB is faster for writes"
Source B: "PostgreSQL is faster for writes"
→ Likely depends on workload and configuration
```

**Consensus:** Where do sources agree?
```
All sources agree: "Choose based on your access patterns"
```

## Step 5: Synthesize Conclusions

Integrate findings into a coherent narrative:

**Template:**
```
## Research Question
[Your question]

## Findings
- Finding 1: [claim] (sources: A, B, C)
- Finding 2: [claim] (sources: D, E)
- Finding 3: [claim] (sources: F)

## Disagreements
- Disagreement 1: [sources conflict on X]
  - Source A says: [claim]
  - Source B says: [claim]
  - Likely reason: [explanation]

## Consensus
- All sources agree: [claim]

## Gaps and Uncertainties
- We don't know: [question]
- We need to test: [experiment]

## Recommendation
Based on [findings], we recommend [decision] because [reasoning].

## Next Steps
1. [Action]
2. [Action]
3. [Action]
```

## Checklist for Deep Research

- [ ] Research question is clear and specific
- [ ] Sources are from multiple channels (official, academic, community)
- [ ] Sources are validated for credibility (author, venue, date, evidence)
- [ ] Key findings are extracted with evidence
- [ ] Disagreements between sources are noted
- [ ] Consensus is identified
- [ ] Gaps and uncertainties are acknowledged
- [ ] Conclusion is evidence-based (not opinion)
- [ ] Recommendation is actionable
- [ ] Sources are cited with URLs

