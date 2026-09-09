import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PublicRoute } from './components/PublicRoute';
import { LoginPage } from './pages/Login';
import { AgentsPage } from './pages/Agents';
import { ProvidersPage } from './pages/Providers';
import { ApiKeysPage } from './pages/ApiKeys';
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
        path: 'providers',
        element: <ProvidersPage />,
      },
      {
        path: 'api-keys',
        element: <ApiKeysPage />,
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
