import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

export interface RuntimeInfo {
  runtime: string;
  commands: {
    install: string | null;
    build: string | null;
    test: string | null;
    lint: string | null;
  };
}

export function detectRuntime(repoPath: string): RuntimeInfo {
  if (!existsSync(repoPath)) {
    return {
      runtime: "unknown",
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
      commands: {
        install: "dotnet restore",
        build: "dotnet build --no-restore",
        test: "dotnet test --no-build",
        lint: "dotnet format --verify-no-changes",
      },
    };
  }

  // Check for Node.js
  if (existsSync(join(repoPath, "package.json"))) {
    const hasLock = existsSync(join(repoPath, "package-lock.json"));
    return {
      runtime: "node",
      commands: {
        install: hasLock ? "npm ci" : "npm install",
        build: "npm run build --if-present",
        test: "npm test --if-present",
        lint: "npm run lint --if-present",
      },
    };
  }

  // Check for Python
  if (
    existsSync(join(repoPath, "pyproject.toml")) ||
    existsSync(join(repoPath, "requirements.txt"))
  ) {
    return {
      runtime: "python",
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
    commands: {
      install: null,
      build: null,
      test: null,
      lint: null,
    },
  };
}
