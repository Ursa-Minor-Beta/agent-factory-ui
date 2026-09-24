import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Center, Loader } from '@mantine/core';
import { Layout } from './layout/Layout';
import { ProtectedRoute } from './layout/ProtectedRoute';
import { PublicRoute } from './layout/PublicRoute';

// Lazy load pages
const LoginPage = lazy(() => import('./pages/Login').then(m => ({ default: m.LoginPage })));
const AgentsPage = lazy(() => import('./pages/Agents').then(m => ({ default: m.AgentsPage })));
const ChatPage = lazy(() => import('./pages/Chat/Chat').then(m => ({ default: m.ChatPage })));
const ProvidersPage = lazy(() => import('./pages/Providers').then(m => ({ default: m.ProvidersPage })));
const SecretsPage = lazy(() => import('./pages/Secrets').then(m => ({ default: m.SecretsPage })));
const FilesPage = lazy(() => import('./pages/Files').then(m => ({ default: m.FilesPage })));
const RunsPage = lazy(() => import('./pages/Runs/index').then(m => ({ default: m.RunsPage })));
const SessionsPage = lazy(() => import('./pages/Sessions/index').then(m => ({ default: m.SessionsPage })));
const SystemSettings = lazy(() => import('./pages/Settings').then(m => ({ default: m.SystemSettings })));
const UsersSettings = lazy(() => import('./pages/Settings').then(m => ({ default: m.UsersSettings })));
const ApiKeysSettings = lazy(() => import('./pages/Settings').then(m => ({ default: m.ApiKeysSettings })));
const CollectionsPage = lazy(() => import('./pages/Collections').then(m => ({ default: m.CollectionsPage })));
const CollectionRecordsPage = lazy(() => import('./pages/Collections').then(m => ({ default: m.CollectionRecordsPage })));

const PageLoader = () => (
  <Center style={{ height: '100%', minHeight: 400 }}>
    <Loader />
  </Center>
);

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <PublicRoute>
        <Suspense fallback={<PageLoader />}>
          <LoginPage />
        </Suspense>
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
        path: 'secrets',
        element: <SecretsPage />,
      },
      {
        path: 'files',
        element: <FilesPage />,
      },
      {
        path: 'collections',
        element: <CollectionsPage />,
      },
      {
        path: 'collections/:collection/records',
        element: <CollectionRecordsPage />,
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
        path: 'settings',
        children: [
          {
            index: true,
            element: <Navigate to="/settings/api-keys" replace />,
          },
          {
            path: 'system',
            element: (
              <ProtectedRoute adminOnly>
                <Suspense fallback={<PageLoader />}>
                  <SystemSettings />
                </Suspense>
              </ProtectedRoute>
            ),
          },
          {
            path: 'users',
            element: (
              <ProtectedRoute adminOnly>
                <Suspense fallback={<PageLoader />}>
                  <UsersSettings />
                </Suspense>
              </ProtectedRoute>
            ),
          },
          {
            path: 'api-keys',
            element: (
              <Suspense fallback={<PageLoader />}>
                <ApiKeysSettings />
              </Suspense>
            ),
          },
        ],
      },
    ],
  },
]);
