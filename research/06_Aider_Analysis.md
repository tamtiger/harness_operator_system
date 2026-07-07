# Aider Architecture Research — Comprehensive Technical Report

Aider is an open-source, terminal-based AI pair programming tool. It's written in Python and emphasizes Git integration, repository-aware context management, and minimal overhead.

---

## 1. Repository Map System (Tree-sitter Based)

### How It Works — Three Phases:

**Phase 1: Symbol Extraction (Tree-sitter)**
- For every file, Aider identifies the language by file extension and loads the corresponding **Tree-sitter parser**
- Files are parsed into **Abstract Syntax Trees (ASTs)** to identify classes, functions, variable scopes
- Language-specific `.scm` (Scheme) query files in `aider/queries/` directory extract "captures" — tagging definitions and references (e.g., `@name.definition.function`)
- Tags are cached in a **SQLite database** via `diskcache`, using file modification times (`mtime`) to trigger re-parsing only when files change
- Each tag is a `Tag` namedtuple containing: file path, line number, symbol name, and kind (def/ref)

**Phase 2: Graph Building and Ranking**
- Aider builds a **directed graph** where files are nodes and dependencies (from definitions/references) form edges
- Runs a **PageRank-inspired algorithm** to rank importance of symbols and files based on relationships and relevance to current conversation
- Prioritizes files relevant to the current "chat" (files being edited) when calculating output

**Phase 3: Map Rendering**
- Renders top-ranked definitions as **"scope-aware elided code views"** — concise representations of signatures and context
- Dynamically generated to fit within **token budget** (defaults to 1,024 tokens via `--map-tokens`)
- The map is **stateless** — computed per session, not a persistent knowledge graph

**Why Tree-sitter over ctags:**
- Rich structural data (full function signatures, type info, deeper hierarchy)
- Language-agnostic via modular parsers
- Deterministic accuracy vs fuzzy keyword/embedding approaches

---

## 2. Configuration System (`.aider.conf.yml`)

### Configuration Methods (in precedence order, lowest to highest):
1. `.aider.conf.yml` in **home directory** (`~/.aider.conf.yml`)
2. `.aider.conf.yml` in **git repository root**
3. `.aider.conf.yml` in **current working directory**
4. **Environment variables** (`AIDER_xxx` format, e.g., `AIDER_DARK_MODE=true`)
5. **Command-line flags** (always take highest precedence)

### Example `.aider.conf.yml`:
```yaml
model: openai/claude-3-7-sonnet
read:
  - CONVENTIONS.md
  - DESIGN.md
dark-mode: true
pretty: true
auto-commits: true
auto-lint: true
alias:
  - "sonnet:openai/claude-3.7-sonnet"
  - "flash:gemini/gemini-2.5-flash"
weak-model: openai/gpt-4o-mini
editor-model: openai/claude-3.7-sonnet-thought
```

---

## 3. Conventions File (`.aider.conventions.md` / `CONVENTIONS.md`)

- By default, Aider looks for a file named **`CONVENTIONS.md`** (can be any name with `--conventions-file` flag)
- Acts as a **persistent system prompt** — read-only instructions sent with every request
- Purpose: library preferences, coding style, documentation standards, testing requirements

### Loading Methods:
1. **Manual**: `aider --read CONVENTIONS.md` or in-chat `/read CONVENTIONS.md`
2. **Automatic** (recommended): Add to `.aider.conf.yml`:
   ```yaml
   read:
     - CONVENTIONS.md
   ```

### Best Practices:
- Keep focused on high-level rules, architecture preferences, library choices
- Benefits from **prompt caching** (read-only files are efficiently cached)
- Interoperable with `AGENTS.md` standard used by Cline, Cursor, etc.

---

## 4. Edit Formats

### Four Primary Formats:

| Format | Syntax | Use Case |
|--------|--------|----------|
| **`whole`** | Returns entire updated file | Small files; models that struggle with diff syntax |
| **`diff`** (search/replace) | `<<<<<<< SEARCH` / `=======` / `>>>>>>> REPLACE` blocks | Most common; efficient token usage |
| **`udiff`** | Standard unified diff (`---`, `+++`, `@@` hunks) | Combats "lazy coding"; forces rigorous output |
| **`diff-fenced`** | Like `diff` but file path inside code fence | For Gemini models that fail standard fencing |

### Search/Replace Block Exact Syntax:
```text
path/to/your/file.ext
<<<<<<< SEARCH
[exact text to find]
=======
[new text to replace with]
>>>>>>> REPLACE
```

### Key Rules:
- SEARCH block must match existing file content **exactly** (indentation, whitespace, line endings)
- Search block must be **unique** within the file
- Aider employs **fuzzy matching for leading whitespace** to handle minor indentation mismatches

---

## 5. Context Management

### File Types in Chat:
- **Editable files** (`/add`): Aider can read AND edit these
- **Read-only files** (`/read-only` or `--read`): Aider can read for context but will NOT edit

### Key Design Principles:
- **Be selective** — too many files distracts the LLM and increases cost
- **Repo map handles context automatically** — you don't need to add every relevant file
- Read-only files benefit from **prompt caching** for efficiency

---

## 6. Git Integration

### Auto-Commit Behavior:
- **`--auto-commits` (default: True)**: Creates a commit after every successful AI edit
- **`--dirty-commits` (default: True)**: Automatically commits YOUR uncommitted changes before AI edits begin
- This ensures **separation** between human and AI commits
- Commit messages are automatically generated

### Key Features:
- Git is the **"unit of truth"** and primary undo system
- `/undo` reverts the last AI commit
- `/commit` manually commits all dirty changes with a generated message
- Standard git tools (`git diff`, `git revert`) work seamlessly

---

## 7. Architect Mode vs Code Mode

### Code Mode (Default):
- **Single-step process**: LLM reasons AND outputs edit format in one turn
- Best for simple tasks, small bug fixes, straightforward features
- Model must split attention between solving problem and formatting edits

### Architect Mode:
- **Two-step process** using two separate roles:
  1. **Architect Model**: Focuses entirely on high-level reasoning and planning
  2. **Editor Model**: Translates the plan into precise code edits
- Best for complex refactoring, significant architectural changes
- Can use **different models** for each role (e.g., powerful model for architect, faster/cheaper for editor)

---

## 8. Linting and Testing Integration

### Linting:
- **Built-in**: Uses tree-sitter linters for popular languages (syntax errors, structural issues)
- **Auto-lint** (default: on): Lints files after each LLM edit
- **Custom linters**: `--lint-cmd <cmd>` or `--lint "language: cmd"` for language-specific
- **Workflow**: Errors detected → LLM-friendly report generated (with AST context) → Aider prompts to fix → iterates until clean

### Testing:
- Configure with `--test-cmd "pytest"` (or any test command)
- After edits, if test returns non-zero exit code → output captured → fed back to LLM → auto-fix attempted

---

## 9. Multi-Model Support Architecture

### Architecture:
- Aider uses **LiteLLM** as its model routing layer → supports 100+ LLM providers
- Model-agnostic: core logic is the same regardless of provider
- Format: `--model provider/model-name` (e.g., `anthropic/claude-3-5-sonnet`)

### Advanced Configuration:
- **`.aider.model.metadata.json`**: Custom context windows, token costs for unrecognized models
- **`.aider.model.settings.yml`**: Override model behaviors
- **Model aliases**: Map shorthand names in `.aider.conf.yml`

---

## Bonus: Key Source Code Structure

```
aider/
├── coders/                    # Coder implementations
│   ├── base_coder.py          # Base Coder class (orchestrator)
│   ├── editblock_coder.py     # SEARCH/REPLACE format
│   ├── wholefile_coder.py     # Whole file format
│   ├── udiff_coder.py         # Unified diff format
│   └── architect_coder.py     # Architect mode (two-step)
├── queries/                   # Tree-sitter .scm query files per language
├── repomap.py                 # Repository map generation (PageRank + tree-sitter)
├── io.py                      # User interaction layer
├── models.py                  # Model configuration and LiteLLM integration
└── main.py                    # CLI entry point
```
