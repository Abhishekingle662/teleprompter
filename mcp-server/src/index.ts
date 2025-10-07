import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "node:fs/promises";
import path from "node:path";

const server = new McpServer({
  name: "teleprompter-mcp",
  version: "0.1.0",
});

const workspaceRootEnv = process.env.MCP_WORKSPACE_ROOT;
const workspaceRoot = workspaceRootEnv
  ? path.resolve(workspaceRootEnv)
  : process.cwd();

const defaultScriptTarget =
  process.env.MCP_SCRIPT_PATH && process.env.MCP_SCRIPT_PATH.trim().length > 0
    ? process.env.MCP_SCRIPT_PATH.trim()
    : "scripts/current.txt";

function resolveWorkspacePath(requestedPath: string) {
  const absolute = path.resolve(workspaceRoot, requestedPath);
  const rel = path.relative(workspaceRoot, absolute);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error(`Path escapes workspace root: ${requestedPath}`);
  }
  return absolute;
}

function resolveScriptPath(customPath?: string) {
  const target =
    customPath && customPath.trim().length > 0 ? customPath : defaultScriptTarget;
  return resolveWorkspacePath(target);
}

const listFilesSchema = z.object({
  path: z.string().default("."),
  recursive: z.boolean().default(false),
  includeHidden: z.boolean().default(false),
});

const readFileSchema = z.object({
  path: z.string(),
  encoding: z.enum(["utf8", "base64"]).default("utf8"),
});

const writeScriptSchema = z.object({
  contents: z.string(),
  encoding: z.enum(["utf8", "base64"]).default("utf8"),
  path: z.string().optional(),
});

const readScriptSchema = z.object({
  path: z.string().optional(),
  encoding: z.enum(["utf8", "base64"]).default("utf8"),
});

server.registerTool(
  "list_files",
  {
    description:
      "List files and folders within the workspace. Provide a relative path to inspect subdirectories.",
    inputSchema: listFilesSchema.shape,
  },
  async (rawArgs?: unknown) => {
    const { path: requestedPath, recursive, includeHidden } =
      listFilesSchema.parse(rawArgs ?? {});
    const root = resolveWorkspacePath(requestedPath);

    async function walk(dir: string): Promise<Array<Record<string, unknown>>> {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      const results: Array<Record<string, unknown>> = [];

      for (const entry of entries) {
        if (!includeHidden && entry.name.startsWith(".")) {
          continue;
        }
        const entryPath = path.join(dir, entry.name);
        const relativePath = path.relative(workspaceRoot, entryPath);
        const stats = await fs.stat(entryPath);

        results.push({
          name: entry.name,
          path: relativePath.replace(/\\/g, "/"),
          kind: entry.isDirectory() ? "directory" : "file",
          size: entry.isDirectory() ? undefined : stats.size,
          modified: stats.mtime.toISOString(),
        });

        if (recursive && entry.isDirectory()) {
          results.push(...(await walk(entryPath)));
        }
      }

      return results;
    }

    const data = await walk(root);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              workspaceRoot,
              path: requestedPath,
              files: data,
            },
            null,
            2,
          ),
        },
      ],
    };
  },
);

server.registerTool(
  "read_file",
  {
    description:
      "Read the contents of a file in the workspace. Returns UTF-8 text by default.",
    inputSchema: readFileSchema.shape,
  },
  async (rawArgs?: unknown) => {
    const { path: requestedPath, encoding } =
      readFileSchema.parse(rawArgs ?? {});
    const filePath = resolveWorkspacePath(requestedPath);
    const content = await fs.readFile(filePath);
    const text =
      encoding === "utf8" ? content.toString("utf8") : content.toString("base64");

    return {
      content: [
        {
          type: "text",
          text,
        },
      ],
    };
  },
);

server.registerTool(
  "read_script",
  {
    description:
      "Read the live teleprompter script. Uses scripts/current.txt by default, unless a custom path is supplied.",
    inputSchema: readScriptSchema.shape,
  },
  async (rawArgs?: unknown) => {
    const { path: customPath, encoding } = readScriptSchema.parse(rawArgs ?? {});
    const filePath = resolveScriptPath(customPath);
    const buffer = await fs.readFile(filePath);
    const relative = path
      .relative(workspaceRoot, filePath)
      .replace(/\\/g, "/");

    if (encoding === "utf8") {
      return {
        content: [
          {
            type: "text",
            text: buffer.toString("utf8"),
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              path: relative,
              encoding,
              data: buffer.toString("base64"),
            },
            null,
            2,
          ),
        },
      ],
    };
  },
);

const writeFileSchema = z.object({
  path: z.string(),
  contents: z.string(),
  encoding: z.enum(["utf8", "base64"]).default("utf8"),
  overwrite: z.boolean().default(false),
});

server.registerTool(
  "write_file",
  {
    description:
      "Create or overwrite a file in the workspace. Fails if the file exists unless overwrite is true.",
    inputSchema: writeFileSchema.shape,
  },
  async (rawArgs?: unknown) => {
    const { path: requestedPath, contents, encoding, overwrite } =
      writeFileSchema.parse(rawArgs ?? {});
    const filePath = resolveWorkspacePath(requestedPath);

    try {
      const stat = await fs.stat(filePath);
      if (stat && !overwrite) {
        throw new Error("File already exists. Set overwrite to true to replace.");
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }

    await fs.mkdir(path.dirname(filePath), { recursive: true });

    const buffer =
      encoding === "utf8"
        ? Buffer.from(contents, "utf8")
        : Buffer.from(contents, "base64");
    await fs.writeFile(filePath, buffer);

    return {
      content: [
        {
          type: "text",
          text: `Wrote ${buffer.length} bytes to ${requestedPath}`,
        },
      ],
    };
  },
);

server.registerTool(
  "write_script",
  {
    description:
      "Write the live teleprompter script. Uses scripts/current.txt by default, unless a custom path is supplied.",
    inputSchema: writeScriptSchema.shape,
  },
  async (rawArgs?: unknown) => {
    const { contents, encoding, path: customPath } =
      writeScriptSchema.parse(rawArgs ?? {});
    const filePath = resolveScriptPath(customPath);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const buffer =
      encoding === "utf8"
        ? Buffer.from(contents, "utf8")
        : Buffer.from(contents, "base64");
    await fs.writeFile(filePath, buffer);

    const relative = path
      .relative(workspaceRoot, filePath)
      .replace(/\\/g, "/");

    return {
      content: [
        {
          type: "text",
          text: `Script saved to ${relative} (${buffer.length} bytes)`,
        },
      ],
    };
  },
);

const updateFileSchema = z.object({
  path: z.string(),
  contents: z.string(),
  encoding: z.enum(["utf8", "base64"]).default("utf8"),
});

server.registerTool(
  "update_file",
  {
    description:
      "Replace the contents of an existing file in the workspace. The file must already exist.",
    inputSchema: updateFileSchema.shape,
  },
  async (rawArgs?: unknown) => {
    const { path: requestedPath, contents, encoding } =
      updateFileSchema.parse(rawArgs ?? {});
    const filePath = resolveWorkspacePath(requestedPath);

    await fs.access(filePath);

    const buffer =
      encoding === "utf8"
        ? Buffer.from(contents, "utf8")
        : Buffer.from(contents, "base64");
    await fs.writeFile(filePath, buffer);

    return {
      content: [
        {
          type: "text",
          text: `Updated ${requestedPath} with ${buffer.length} bytes`,
        },
      ],
    };
  },
);

const appendFileSchema = z.object({
  path: z.string(),
  contents: z.string(),
  encoding: z.enum(["utf8", "base64"]).default("utf8"),
});

server.registerTool(
  "append_file",
  {
    description:
      "Append data to an existing file in the workspace. The file must exist.",
    inputSchema: appendFileSchema.shape,
  },
  async (rawArgs?: unknown) => {
    const { path: requestedPath, contents, encoding } =
      appendFileSchema.parse(rawArgs ?? {});
    const filePath = resolveWorkspacePath(requestedPath);

    await fs.access(filePath);

    const buffer =
      encoding === "utf8"
        ? Buffer.from(contents, "utf8")
        : Buffer.from(contents, "base64");
    await fs.appendFile(filePath, buffer);

    return {
      content: [
        {
          type: "text",
          text: `Appended ${buffer.length} bytes to ${requestedPath}`,
        },
      ],
    };
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(
    `Teleprompter MCP server ready. Workspace root: ${workspaceRoot}`,
  );

  const shutdown = async (signal: NodeJS.Signals) => {
    console.error(`Received ${signal}. Closing MCP server...`);
    await server.close();
    process.exit(0);
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);

  await new Promise<void>(() => {
    // Keep the process running until it is terminated.
  });
}

main().catch((error) => {
  console.error("Failed to start Teleprompter MCP server:", error);
  process.exit(1);
});
