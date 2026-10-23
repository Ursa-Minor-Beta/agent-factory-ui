import { Navigate, useLocation } from 'react-router-dom';
import { Loader, Center } from '@mantine/core';
import { useAuth } from '../contexts/AuthContext';
import { routes } from '../config/routes';

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

export function ProtectedRoute({ children, adminOnly = false }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <Center style={{ height: '100vh' }}>
        <Loader />
      </Center>
    );
  }

  if (!user) {
    // Save current location to redirect back after login
    const redirectTo = location.pathname + location.search;
    return <Navigate to={routes.login(redirectTo)} replace />;
  }

  if (adminOnly && user.role !== 'admin') {
    return <Navigate to={routes.agents()} replace />;
  }

  return <>{children}</>;
}
