# Agent Factory UI

Visual platform for building and managing AI agents through a no-code/low-code interface.

> **⚠️ Note:** The current version is actively being built. There could be breaking changes.

> **🐳 One shot Docker Deployment:** For a complete deployment with both API and UI, see [agent-factory-docker-api-ui](https://github.com/Ursa-Minor-Beta/agent-factory-docker-api-ui).

## Features

- **Node Graph Workflows** - Visual drag-and-drop editor with 11 node types (LLM, HTTP, JS, branch, sub-agent, memory store/search/update/delete), undo/redo, ready-made templates, and `{{node:/secret:/var:}}` reference suggestions in text and JSON fields
- **Agent Builder** - Chat with a builder agent that designs whole multi-agent systems with memory: it reads, adds, edits and removes nodes on the canvas, names the agent, assigns a workspace, saves and test-runs it. Any agent can be picked as the builder
- **Composable Agents** - Agents can call other agents as sub-workflows or llm-tools
- **Agent Relations Graph** - Agents list graph mode and an editor tab showing which agents call which
- **Run in Editor** - Run the agent from the editor with saved inputs, live node status and an animated step-by-step replay on the canvas
- **Multi-Provider LLM** - Provider presets loaded from the backend (OpenAI, Anthropic, Ollama, and any OpenAI-compatible endpoint), global or per-workspace, with a default per provider type
- **Memory & Collections** - Structured storage with semantic search
- **Streaming Chat** - Real-time SSE streaming with session management, tool call display, and message queueing while a run is active
- **GitHub Sync** - Clone/Link agents to repos with push/pull support via a GitHub provider
- **Export/Import** - Export agents to JSON packages with dependencies
- **Execution Monitoring** - Run tracking with node-level timing, logs, tool calls, LLM token usage, and child run tree
- **Encrypted Secrets** - Secure credential storage (AES-256-GCM)
- **Variables** - Plain-text global/workspace variables referenced via `{{var:NAME}}`
- **File Storage** - Built-in file management for agent artifacts
- **Workspaces** - Organize agents and resources into isolated workspaces
- **Multi-User** - JWT auth, API keys, and role-based access (Admin/User)
- **Dark/Light Theme** - Responsive design for desktop, tablet, and mobile

## Getting Started

### Prerequisites

- Node.js 20+
- [Agent-factory](https://github.com/Ursa-Minor-Beta/agent-factory) running on `http://localhost:3000`

### Local Development

```bash
# Install dependencies
npm install

# Copy and configure environment
cp .env.example .env

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

#### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `http://localhost:3000` |
| `VITE_APP_NAME` | Application name | `Agent Factory` |

### Docker

```bash
# Copy and configure environment
cp .env.example .env

# Build and run
docker compose up -d --build

# View logs
docker compose logs -f

# Stop
docker compose down
```

The app will be available at `http://localhost:8080`

> **Note:** `VITE_*` variables are embedded at build time. After changing them in `.env`, you must rebuild with `--build`.

## License

Apache 2.0 — see [LICENSE](LICENSE).
