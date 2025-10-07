You have two main deployment models for the MCP server that keep it in production sync with the Windows Tauri app. Pick whichever fits how your users will run the teleprompter.

1. Local companion process (recommended if the teleprompter runs on the user’s own machine)
Bundle the server

Keep the TypeScript MCP project as-is. During packaging, distribute the compiled dist/index.js plus its package.json dependencies, or package it into a single executable (e.g., with pkg or nexe).
Alternatively, ship the Docker image you already build (teleprompter-mcp) and install Docker Desktop as a prerequisite.
Launch it from Tauri

Add a small Tauri command that spawns the MCP process (either node dist/index.js or docker run …). Ensure MCP_WORKSPACE_ROOT points to the same directory where the app stores scripts (e.g., the user’s documents folder).
On app shutdown, send a signal to stop the process.
Client integration

Since the MCP server uses stdio, the teleprompter or a co-running MCP client (Claude Desktop / ChatGPT) executes the command. No network exposure is required.
Pros: no external infrastructure; users work offline; simplest security profile.
Cons: every Windows machine needs Node/Docker runtime (you can hide this by packaging an exe).

2. Remote MCP service (if you need centralized updates)
Switch to HTTP transport (optional but typical for remote deployments): use StreamableHttpServerTransport from the MCP SDK, listen on an HTTPS port, and authenticate requests (e.g., bearer token). Update the teleprompter to pull scripts via HTTPS instead of the file watcher, or add a backend component that writes to the shared file location.

Deploy the Docker image

Push to a private registry.
Run it on a small VM or container platform (e.g., Azure Container Apps, ECS, GKE). Mount persistent storage for the script file, or have the server write to an object store / database.
Expose the HTTPS endpoint behind a reverse proxy (nginx, Traefik) with TLS.
Configure clients

Provide the MCP URL plus credentials to users (Claude/ChatGPT accept remote MCP endpoints).
The teleprompter needs a sync mechanism—either polling the remote API, subscribing to events, or receiving notifications that trigger the watcher to refresh from the network.
Pros: centralized content management, works across devices.
Cons: you must secure the API, add authentication, host infrastructure, and adapt the teleprompter to receive remote updates.

Practical steps you can tackle now
Finalize the local workflow

Rebuild/push the Docker image after the recent code changes:
docker build -t teleprompter-mcp:latest -f mcp-server/Dockerfile mcp-server
Push it to a registry if you want to share it.
Document the command for Windows users (your current docker run --rm -i -v … -e MCP_WORKSPACE_ROOT … line), or embed it into the teleprompter’s startup.
Automate MCP startup

Add a Tauri command that runs the container (or Node script) in the background. Use tauri::async_runtime::spawn and capture stdout/stderr for logs.
Store the chosen script path in settings (scripts/current.txt by default) so the MCP server and app always agree.
Production build of the teleprompter

Run npm run tauri build to produce the Windows installer. Include instructions in your README explaining that MCP-capable clients can point to the packaged command to automate script writing.
Optional: plan for remote hosting

If you ultimately need multi-device access, budget for converting the MCP server to an HTTPS service with authentication and updating the teleprompter to fetch remote content rather than relying solely on file watching.
By default, it’s easiest to keep everything local: ship the MCP server alongside the teleprompter, start it when the app runs, and let Claude/ChatGPT integrations target that command. If requirements push you to the cloud, swap in the HTTP transport and treat it like any other web service, keeping security (TLS, auth) in mind.

