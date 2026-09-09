import { Navigate } from 'react-router-dom';
import { Loader, Center } from '@mantine/core';
import { useAuth } from '../contexts/AuthContext';

interface PublicRouteProps {
  children: React.ReactNode;
}

export function PublicRoute({ children }: PublicRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Center style={{ height: '100vh' }}>
        <Loader />
      </Center>
    );
  }

  if (user) {
    return <Navigate to="/agents" replace />;
  }

  return <>{children}</>;
}
