# Harness Operator System

Harness Operator System is an AI-native orchestration platform designed to run, manage, and govern AI agents safely and efficiently across repositories.

---

## Architecture & Concepts

The platform is structured into 6 logical domains:
- **Platform (Control Plane)**: Orchestration, updates, syncing, and entry points.
- **Repository (Persistence Plane)**: Manifest parsing, asset loading, and filesystem isolation.
- **Context**: Budgeting, ranking, and filtering repository assets for agent reasoning windows.
- **Execution (Runtime Plane)**: Executing tasks sequentially and verifying steps.
- **Capability**: Execution modules register their capabilities to be securely invoked.
- **Governance (Knowledge Plane)**: Safe proposal workflow, review, audit trail, and promotion of assets to shared harness space.

For comprehensive architectural specifications, refer to [03_SYSTEM_ARCHITECTURE.md](knowledge_base/03_SYSTEM_ARCHITECTURE.md).

---

## Project Setup

### Prerequisites
- Node.js (version 20+)
- npm

### Installation
Clone the repository and install the dependencies:
```bash
npm install
```

### Build & Check
Verify TypeScript typing and configuration:
```bash
npm run build
```

### Running Tests
Run unit tests across utility models and error handling structures:
```bash
npm run test
```

### Linting
Validate codebase formatting and styles:
```bash
npm run lint
```

---

## How to Use (CLI Commands)

We use `npx tsx` to run the CLI directly from the TypeScript source files without needing a manual build step.

### 1. Initialize a New Repository
Initializes the Harness Operator configuration in the target directory (creates `.harness/harness.yaml`, `.harness/rules/`, `.harness/repository-map.md`, and `AGENTS.md` using templates).

```bash
# Initialize in current directory
npx tsx src/adapters/cli/index.ts init

# Initialize in a specific directory
npx tsx src/adapters/cli/index.ts init ./my-new-project

# Force overwrite of existing files
npx tsx src/adapters/cli/index.ts init --force
```

### 2. Validate Repository Layout
Validates the repository structure, ensuring manifest syntax schema passes, necessary file assets exist, and checks for circular dependencies or path traversal attempts.

```bash
# Validate current directory
npx tsx src/adapters/cli/index.ts validate

# Validate specific directory
npx tsx src/adapters/cli/index.ts validate ./my-new-project

# Exit codes:
#   0: Valid structure
#   1: Warnings present (e.g. AGENTS.md exceeds size limits)
#   2: Errors present (e.g. missing manifest or schema violations)
```

### 3. Check Asset Status
Scans local and shared assets, applying override, merge, and append resolution strategies, and prints details about loaded rules, prompts, templates, capabilities, and workflows.

```bash
# View human-readable loaded asset counts
npx tsx src/adapters/cli/index.ts status

# View status output in JSON format
npx tsx src/adapters/cli/index.ts status --json
```

### 4. Inspect Runtime Context
Extracts context metadata, performs filtering/ranking on assets, and allocates a token budget based on a task request's parameters.

```bash
# Inspect runtime context built for a specific task description
npx tsx src/adapters/cli/index.ts context --task "implement JWT authentication"
```

