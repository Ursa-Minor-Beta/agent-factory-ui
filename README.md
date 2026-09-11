# Agent Factory UI

React frontend for the Agent Factory platform.

## Tech Stack

- **React 19** with TypeScript
- **Vite** for fast development and building
- **Mantine UI** for components
- **React Router** for navigation
- **React Hook Form** for form handling
- **React Virtuoso** for virtualized lists

## Features

- **Authentication** - Cookie-based auth with automatic token refresh
- **Agents Management** - Create, edit, delete AI agents
- **Chat Interface** - Real-time chat with agents, incognito mode support
- **Provider Settings** - Configure OpenAI, Anthropic, Ollama providers
- **API Keys** - Generate and manage API keys with permissions
- **User Management** - Admin-only user creation (admin role required)

## Getting Started

### Prerequisites

- Node.js 20+
- Agent Factory backend running on `http://localhost:3000`

### Local Development

#### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `http://localhost:3000` |
| `VITE_APP_NAME` | Application name | `Agent Factory` |

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Docker

#### Docker Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL (build-time) | `http://localhost:3000` |
| `VITE_APP_NAME` | Application name (build-time) | `Agent Factory` |
| `PORT` | Host port to expose | `8080` |


```bash
# Copy and configure environment
cp .env.example .env
# Edit .env with your values

# Build and run
docker compose up -d --build

# View logs
docker compose logs -f

# Stop
docker compose down

# Rebuild after changing
docker compose up -d --build --force-recreate
```

The app will be available at `http://localhost:8080`

> **Note:** `VITE_*` variables are embedded at build time. After changing them in `.env`, you must rebuild with `--build`.

## Licence

Apache 2.0 — see [LICENSE](LICENSE).
