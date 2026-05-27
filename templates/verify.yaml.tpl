{{#if_node}}
runtime: node
commands:
  install: "npm ci"
  build: "npm run build --if-present"
  test: "npm test --if-present"
  lint: "npm run lint --if-present"
  typecheck: null
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
timeouts:
  build: 120
  test: 300
{{/if_go}}
