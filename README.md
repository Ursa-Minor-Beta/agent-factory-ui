# Agent Factory UI

React frontend for the Agent Factory platform - a visual workflow builder for AI agents.

## Tech Stack

- **React 19** with TypeScript
- **Vite** for fast development and building
- **Material UI (MUI)** for components
- **React Router** for navigation
- **React Hook Form** for form handling

## Features

- **Authentication** - Cookie-based auth with login/logout
- **Agents Management** - Create, edit, delete AI agents
- **Provider Settings** - Configure OpenAI, Anthropic, Ollama providers
- **API Keys** - Generate and manage API keys with permissions
- **User Management** - Admin-only user creation (admin role required)

## Getting Started

### Prerequisites

- Node.js 18+
- Agent Factory backend running on `http://localhost:3000`

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `http://localhost:3000` |
| `VITE_APP_NAME` | Application name | `Agent Factory` |

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start development server
npm run dev
```


## Scripts

```bash
npm run dev      # Start dev server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run linter
```
