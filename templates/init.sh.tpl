#!/usr/bin/env bash
set -euo pipefail

# harness-os init script for {{REPO_NAME}} ({{STACK}})
# Generated on {{DATE}}
# Package manager: {{PM_NAME}}

echo "=== harness init: {{REPO_NAME}} ({{STACK}}) ==="

# 1. Check Node.js (required for harness-os)
if ! command -v node &> /dev/null; then
  echo "✗ Node.js not found. Install Node 20+"
  exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  echo "✗ Node.js $NODE_VERSION found, need 20+"
  exit 1
fi
echo "✓ Node.js $(node -v)"

# 2. Stack-specific checks
{{#if_node}}
# Waterfall: Bun → npm → fail
if command -v bun &> /dev/null; then
  bun install
  echo "✓ Dependencies installed (bun)"
elif command -v npm &> /dev/null; then
  if [ -f package-lock.json ]; then
    npm ci
  else
    npm install
  fi
  echo "✓ Dependencies installed (npm)"
else
  echo "✗ No JS package manager found."
  echo "  Install Bun: https://bun.sh"
  echo "  Or Node.js:  https://nodejs.org"
  exit 1
fi
{{/if_node}}
{{#if_dotnet}}
if command -v dotnet &> /dev/null; then
  dotnet restore
  echo "✓ .NET dependencies restored"
else
  echo "✗ dotnet CLI not found"
  exit 1
fi
{{/if_dotnet}}
{{#if_python}}
if command -v python3 &> /dev/null; then
  if [ -f pyproject.toml ]; then
    pip install -e . 2>/dev/null || pip install -r requirements.txt 2>/dev/null || true
  elif [ -f requirements.txt ]; then
    pip install -r requirements.txt
  fi
  echo "✓ Python dependencies installed"
else
  echo "✗ python3 not found"
  exit 1
fi
{{/if_python}}
{{#if_go}}
if command -v go &> /dev/null; then
  go mod download
  echo "✓ Go modules downloaded"
else
  echo "✗ go not found"
  exit 1
fi
{{/if_go}}

# 3. Verify harness setup
if [ -d .harness ]; then
  echo "✓ .harness/ directory exists"
else
  echo "✗ .harness/ not found — run 'harness init' first"
  exit 1
fi

echo ""
echo "=== Ready for agentic coding ==="