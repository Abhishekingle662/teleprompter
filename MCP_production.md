
# 🧭 MCP Server Deployment Guide

This document outlines the **two main deployment models** for running the **MCP server** in production sync with the **Windows Tauri Teleprompter app**.
Choose the model that best fits how your users will run the teleprompter.

---

## 🚀 1. Local Companion Process *(Recommended)*

Ideal when the teleprompter runs directly on the user’s machine.

### 🧩 Bundle the Server

* Keep the TypeScript MCP project as-is.
* During packaging, distribute:

  * The compiled `dist/index.js` and its `package.json` dependencies, **or**
  * A single executable using **pkg** or **nexe**.
* Alternatively, ship the prebuilt Docker image `teleprompter-mcp`, requiring **Docker Desktop** as a prerequisite.

### ⚙️ Launch from Tauri

1. Add a small **Tauri command** to spawn the MCP process:

   * `node dist/index.js`, or
   * `docker run …` (your existing command)
2. Set the environment variable `MCP_WORKSPACE_ROOT` to the same directory used for storing scripts (e.g., the user’s documents folder).
3. On app shutdown, send a termination signal to stop the process cleanly.

### 🔌 Client Integration

* The MCP server uses **stdio**, allowing the teleprompter or a co-running client (e.g., **Claude Desktop** or **ChatGPT**) to execute it directly.
* No network exposure is required.

#### ✅ Pros

* No external infrastructure.
* Works fully offline.
* Simplest security profile.

#### ⚠️ Cons

* Requires Node.js or Docker runtime on each Windows machine.
  *(You can package an `.exe` to hide this dependency.)*

---

## ☁️ 2. Remote MCP Service

Choose this option if you need **centralized updates** or multi-device access.

### 🌐 Switch to HTTP Transport

* Use `StreamableHttpServerTransport` from the MCP SDK.
* Listen on an **HTTPS** port and **authenticate** requests (e.g., bearer tokens).
* Update the teleprompter to:

  * Pull scripts via HTTPS instead of file watching, or
  * Integrate a backend that writes to the shared file location.

### 🐳 Deploy the Docker Image

1. Push your image to a private registry.
2. Run on a small VM or container platform (Azure Container Apps, ECS, or GKE).
3. Mount persistent storage for script files, or connect to an object store/database.
4. Expose the HTTPS endpoint behind **nginx** or **Traefik**, with proper **TLS**.

### 🧾 Configure Clients

* Provide users with the **MCP URL** and authentication credentials.
* Update the teleprompter to:

  * Poll the remote API,
  * Subscribe to server events, or
  * Receive notifications that trigger the local file watcher to refresh.

#### ✅ Pros

* Centralized content management.
* Works across multiple devices.

#### ⚠️ Cons

* Requires infrastructure hosting and security setup.
* Must add authentication.
* The teleprompter must handle remote updates.

---

## 🔧 Practical Next Steps

### 1. Finalize the Local Workflow

Rebuild and push the Docker image after code changes:

```bash
docker build -t teleprompter-mcp:latest -f mcp-server/Dockerfile mcp-server
```

If you plan to share it:

```bash
docker push <your-registry>/teleprompter-mcp:latest
```

Document the run command for Windows users (your `docker run --rm -i -v …` line), or embed it in the teleprompter’s startup.

---

### 2. Automate MCP Startup

* Add a **Tauri command** to run the MCP (Node or Docker) in the background using:

  ```rust
  tauri::async_runtime::spawn(...)
  ```
* Capture `stdout`/`stderr` for logs.
* Store the chosen script path in settings (default: `scripts/current.txt`) to keep the app and MCP server in sync.

---

### 3. Build for Production

Run:

```bash
npm run tauri build
```

Then, update your README to explain how **MCP-capable clients** can use the packaged command to automate script writing.

---

### 4. Optional: Plan for Remote Hosting

If multi-device access is needed:

* Convert the MCP server to an HTTPS service.
* Add authentication and TLS.
* Update the teleprompter to fetch scripts via HTTPS instead of local files.

