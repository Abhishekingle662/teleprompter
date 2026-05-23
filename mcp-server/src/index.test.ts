import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm, writeFile as fsWriteFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

let tmpRoot: string;
let mod: typeof import("./index.js");

beforeAll(async () => {
  tmpRoot = await mkdtemp(path.join(tmpdir(), "mcp-test-"));
  // Module-level constants in index.ts read these env vars at import time,
  // so they must be set before the dynamic import below.
  process.env.MCP_WORKSPACE_ROOT = tmpRoot;
  delete process.env.MCP_SCRIPT_PATH;
  mod = await import("./index.js");
});

afterAll(async () => {
  if (tmpRoot) {
    await rm(tmpRoot, { recursive: true, force: true });
  }
});

describe("resolveWorkspacePath", () => {
  it("throws when the requested path escapes the workspace root", () => {
    expect(() => mod.resolveWorkspacePath("../../etc/passwd")).toThrow(
      /escapes workspace root/,
    );
  });
});

describe("write_file overwrite guard", () => {
  const filename = "existing.txt";

  beforeEach(async () => {
    await fsWriteFile(path.join(tmpRoot, filename), "original");
  });

  it("rejects with 'File already exists' when the target exists and overwrite is false", async () => {
    await expect(
      mod.writeFile({ path: filename, contents: "replacement" }),
    ).rejects.toThrow(/File already exists/);
  });
});

describe("resolveScriptPath (read_script default path)", () => {
  it("falls back to scripts/current.txt when no path arg is supplied", () => {
    const resolved = mod.resolveScriptPath();
    expect(resolved.endsWith(path.join("scripts", "current.txt"))).toBe(true);
  });
});
