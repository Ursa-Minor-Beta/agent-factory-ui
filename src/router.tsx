import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PublicRoute } from './components/PublicRoute';
import { LoginPage } from './pages/Login';
import { AgentsPage } from './pages/Agents';
import { ChatPage } from './pages/Chat/Chat';
import { ProvidersPage } from './pages/Providers';
import { ApiKeysPage } from './pages/ApiKeys';
import { SecretsPage } from './pages/Secrets';
import { RunsPage } from './pages/Runs/index';
import { SessionsPage } from './pages/Sessions/index';
import { UsersPage } from './pages/Users';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <PublicRoute>
        <LoginPage />
      </PublicRoute>
    ),
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/agents" replace />,
      },
      {
        path: 'agents',
        element: <AgentsPage />,
      },
      {
        path: 'agents/:agentId/chat',
        element: <ChatPage />,
      },
      {
        path: 'agents/:agentId/chat/:sessionId',
        element: <ChatPage />,
      },
      {
        path: 'providers',
        element: <ProvidersPage />,
      },
      {
        path: 'api-keys',
        element: <ApiKeysPage />,
      },
      {
        path: 'secrets',
        element: <SecretsPage />,
      },
      {
        path: 'runs',
        element: <RunsPage />,
      },
      {
        path: 'sessions',
        element: <SessionsPage />,
      },
      {
        path: 'users',
        element: (
          <ProtectedRoute adminOnly>
            <UsersPage />
          </ProtectedRoute>
        ),
      },
    ],
  },
]);
