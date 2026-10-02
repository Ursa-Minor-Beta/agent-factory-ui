import { Button, Center, Code, Stack, Text, Title } from '@mantine/core';
import { IconRefresh } from '@tabler/icons-react';
import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router-dom';

export function ErrorPage() {
  const navigate = useNavigate();
  const error = useRouteError();

  const getErrorMessage = () => {
    if (isRouteErrorResponse(error)) {
      return `${error.status} - ${error.statusText}`;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return 'An unexpected error occurred';
  };

  return (
    <Center style={{ height: '100vh' }}>
      <Stack align="center" gap="lg">
        <Title
          order={1}
          style={{
            fontSize: '4rem',
            fontWeight: 900,
            lineHeight: 1,
            color: 'var(--mantine-color-red-6)',
          }}
        >
          Oops!
        </Title>
        <Title order={2} c="dimmed">
          Something went wrong
        </Title>
        <Code block color="red" maw={500}>
          {getErrorMessage()}
        </Code>
        <Text c="dimmed" size="sm" ta="center" maw={500}>
          Try refreshing the page or contact support if the problem persists.
        </Text>
        <Button
          variant="light"
          size="md"
          leftSection={<IconRefresh size={18} />}
          onClick={() => window.location.reload()}
        >
          Refresh page
        </Button>
        <Button
          variant="light"
          size="md"
          onClick={() => navigate('/')}
        >
          Home
        </Button>
      </Stack>
    </Center>
  );
}
