import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

export type PackageManager = "npm" | "pnpm";

export interface RuntimeInfo {
  runtime: string;
  packageManager: PackageManager;
  commands: {
    install: string | null;
    build: string | null;
    test: string | null;
    lint: string | null;
  };
}

/**
 * Detect which package manager the repo uses based on lockfile presence.
 * Priority: pnpm-lock.yaml > package-lock.json > npm (default)
 */
export function detectPackageManager(repoPath: string): PackageManager {
  if (existsSync(join(repoPath, "pnpm-lock.yaml"))) {
    return "pnpm";
  }
  // Default to npm (either has package-lock.json or nothing)
  return "npm";
}

/**
 * Get commands for a specific package manager.
 * Note: Does NOT use --if-present (not supported by all PMs).
 * Missing scripts should be handled at runtime by checking package.json.
 */
export function getPmCommands(pm: PackageManager, repoPath?: string): {
  install: string;
  build: string;
  test: string;
  lint: string;
} {
  switch (pm) {
    case "pnpm":
      return {
        install: "pnpm install --frozen-lockfile",
        build: "pnpm build",
        test: "pnpm test",
        lint: "pnpm lint",
      };
    case "npm":
    default:
      // For npm, check if lockfile exists
      const hasNpmLock = repoPath && existsSync(join(repoPath, "package-lock.json"));
      return {
        install: hasNpmLock ? "npm ci" : "npm install",
        build: "npm run build",
        test: "npm test",
        lint: "npm run lint",
      };
  }
}

export function detectRuntime(repoPath: string): RuntimeInfo {
  if (!existsSync(repoPath)) {
    return {
      runtime: "unknown",
      packageManager: "npm",
      commands: { install: null, build: null, test: null, lint: null },
    };
  }

  // Check for .NET
  const files = readdirSync(repoPath);
  const hasSln = files.some((f) => f.endsWith(".sln"));
  const hasCsproj = files.some((f) => f.endsWith(".csproj"));

  if (hasSln || hasCsproj) {
    return {
      runtime: "dotnet",
      packageManager: "npm", // Not applicable
      commands: {
        install: "dotnet restore",
        build: "dotnet build --no-restore",
        test: "dotnet test --no-build",
        lint: "dotnet format --verify-no-changes",
      },
    };
  }

  // Check for Node.js (check package.json first)
  if (existsSync(join(repoPath, "package.json"))) {
    const pm = detectPackageManager(repoPath);
    const pmCommands = getPmCommands(pm, repoPath);
    return {
      runtime: "node",
      packageManager: pm,
      commands: pmCommands,
    };
  }

  // Check for Python
  if (
    existsSync(join(repoPath, "pyproject.toml")) ||
    existsSync(join(repoPath, "requirements.txt"))
  ) {
    return {
      runtime: "python",
      packageManager: "npm",
      commands: {
        install: existsSync(join(repoPath, "pyproject.toml"))
          ? "pip install -e ."
          : "pip install -r requirements.txt",
        build: null,
        test: "pytest",
        lint: "ruff check .",
      },
    };
  }

  // Check for Go
  if (existsSync(join(repoPath, "go.mod"))) {
    return {
      runtime: "go",
      packageManager: "npm",
      commands: {
        install: "go mod download",
        build: "go build ./...",
        test: "go test ./...",
        lint: "golangci-lint run",
      },
    };
  }

  // Check for Rust
  if (existsSync(join(repoPath, "Cargo.toml"))) {
    return {
      runtime: "rust",
      packageManager: "npm",
      commands: {
        install: null,
        build: "cargo build",
        test: "cargo test",
        lint: "cargo clippy",
      },
    };
  }

  // Unknown
  return {
    runtime: "unknown",
    packageManager: "npm",
    commands: {
      install: null,
      build: null,
      test: null,
      lint: null,
    },
  };
}
