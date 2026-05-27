# Claude Code — harness-os Installation

## Quick Install

```bash
claude mcp add harness node <HARNESS_OS>/dist/index.js
```

Replace `<HARNESS_OS>` with the absolute path to your harness-os installation.

## Example

```bash
claude mcp add harness node /home/user/harness-os/dist/index.js
```

## Verify

```bash
claude mcp list
```

Should show `harness` in the list of configured MCP servers.

## Environment Variables

If you need a custom harness home directory:

```bash
HARNESS_HOME=/custom/path claude mcp add harness node /path/to/harness-os/dist/index.js
```

## Uninstall

```bash
claude mcp remove harness
```
