{{#if_node}}
runtime: {{PM_NAME}}
commands:
  install: "{{PM_INSTALL}}"
  build: "{{PM_RUN}} build"
  test: "{{PM_RUN}} test"
  lint: "{{PM_RUN}} lint"
  typecheck: null
  # security_audit: "npm audit --audit-level=moderate"
  # simplify: null
timeouts:
  build: 120
  test: 300
{{/if_node}}
{{#if_dotnet}}
runtime: dotnet
commands:
  install: "dotnet restore"
  build: "dotnet build --no-restore"
  test: "dotnet test --no-build"
  lint: "dotnet format --verify-no-changes"
  typecheck: null
  # security_audit: "dotnet list package --vulnerable"
  # simplify: null
timeouts:
  build: 180
  test: 300
{{/if_dotnet}}
{{#if_python}}
runtime: python
commands:
  install: "pip install -e ."
  build: null
  test: "pytest"
  lint: "ruff check ."
  typecheck: "mypy ."
  # security_audit: "bandit -r ."
  # simplify: null
timeouts:
  build: 60
  test: 300
{{/if_python}}
{{#if_go}}
runtime: go
commands:
  install: "go mod download"
  build: "go build ./..."
  test: "go test ./..."
  lint: "golangci-lint run"
  typecheck: null
  # security_audit: "gosec ./..."
  # simplify: null
timeouts:
  build: 120
  test: 300
{{/if_go}}