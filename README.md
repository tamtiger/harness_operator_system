# Harness Operator System

Harness Operator System is an AI-native orchestration platform designed to run, manage, and govern AI agents safely and efficiently across repositories.

## Architecture & Concepts

The platform is structured into 6 logical domains:
- **Platform (Control Plane)**: Orchestration, updates, syncing, and entry points.
- **Repository (Persistence Plane)**: Manifest parsing, asset loading, and filesystem isolation.
- **Context**: Budgeting, ranking, and filtering repository assets for agent reasoning windows.
- **Execution (Runtime Plane)**: Executing tasks sequentially and verifying steps.
- **Capability**: Execution modules register their capabilities to be securely invoked.
- **Governance (Knowledge Plane)**: Safe proposal workflow, review, audit trail, and promotion of assets to shared harness space.

For comprehensive architectural specifications, refer to [03_SYSTEM_ARCHITECTURE.md](knowledge_base/03_SYSTEM_ARCHITECTURE.md).

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
