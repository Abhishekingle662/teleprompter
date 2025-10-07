# Teleprompter MCP Server

This package provides a [Model Context Protocol](https://modelcontextprotocol.io/) server that exposes the Teleprompter workspace files to MCP-compatible clients. It supports discovering files, reading their contents, creating new files, and updating or appending to existing files.

## Installation

```bash
cd mcp-server
npm install
```

## Usage

```bash
# Run directly with tsx
npm start

# Or build and run the emitted JavaScript
npm run build
node dist/index.js
```

The server communicates over stdio, so it can be registered with any MCP-compatible client or IDE. By default, the workspace root is the current working directory; set `MCP_WORKSPACE_ROOT` to target a different path:

```bash
MCP_WORKSPACE_ROOT="d:/App_Dev/teleprompter" npm start
```

## Docker

Build and run the containerized server:

```bash
cd mcp-server
docker build -t teleprompter-mcp:latest -f mcp-server/Dockerfile mcp-server
docker run --rm -i `
  -v d:/App_Dev/teleprompter:/workspace `
  -e MCP_WORKSPACE_ROOT=/workspace `
  teleprompter-mcp:latest

```

The `-i` flag keeps stdin open so MCP clients (e.g., Claude Desktop, ChatGPT) can use the stdio transport. Mount your workspace into the container and point `MCP_WORKSPACE_ROOT` at the mount to expose files for editing.

## Exposed Tools

| Tool          | Description                                                                                           |
| ------------- | ----------------------------------------------------------------------------------------------------- |
| `list_files`  | Lists files/folders beneath a requested relative path, optionally recursively.                        |
| `read_file`   | Reads file contents (`utf8` text by default, `base64` optional).                                      |
| `write_file`  | Creates or overwrites a file with provided contents; parent directories are created automatically.    |
| `read_script` | Reads the live teleprompter script (defaults to `scripts/current.txt`, override with `path`).         |
| `write_script`| Writes the live teleprompter script (defaults to `scripts/current.txt`, override with `path`).        |
| `update_file` | Replaces the contents of an existing file.                                                            |
| `append_file` | Appends data to an existing file.                                                                     |

All paths must remain inside the configured workspace root; any attempt to escape it is rejected.

### Live script sync

The desktop teleprompter now watches `scripts/current.txt` (or whatever path you provide) for changes and reloads the on-screen text automatically. Use the `write_script` tool from Claude/ChatGPT to push updated copy; the UI refreshes as soon as the file is saved. Set `MCP_SCRIPT_PATH` to change the default target, and pass a `path` argument to override it per-call.
