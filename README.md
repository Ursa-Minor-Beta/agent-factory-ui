# Agent Factory UI

Visual platform for building and managing AI agents through a no-code/low-code interface.

> **⚠️ Note:** The current version is actively being built. There could be breaking changes.

> **🐳 One shot Docker Deployment:** For a complete deployment with both API and UI, see [agent-factory-docker-api-ui](https://github.com/Ursa-Minor-Beta/agent-factory-docker-api-ui).

## Features

- **Visual Agent Builder** - Drag-and-drop node editor with 15+ node types (LLM, HTTP, JavaScript, Branch, Memory, etc.)
- **Real-Time Chat** - Stream responses with live execution status and session management
- **Memory & Collections** - Structured data storage with vector embeddings and semantic search
- **Execution Monitoring** - Detailed run tracking with node-level timing and error logs
- **Secrets & Files** - Secure credential storage and file management
- **API Keys** - Generate keys with granular permissions for programmatic access
- **User Management** - Role-based access control (Admin/User)
- **Workspaces** - Organize agents into workspaces with flexible deletion options
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
