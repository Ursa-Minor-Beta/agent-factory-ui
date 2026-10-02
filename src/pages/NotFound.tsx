import { Button, Center, Stack, Text, Title } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <Center style={{ height: '100vh' }}>
      <Stack align="center" gap="lg">
        <Title
          order={1}
          style={{
            fontSize: '8rem',
            fontWeight: 900,
            lineHeight: 1,
            color: 'var(--mantine-color-cyan-6)',
          }}
        >
          404
        </Title>
        <Title order={2} c="dimmed">
          Page not found
        </Title>
        <Text c="dimmed" size="lg" ta="center" maw={500}>
          The page you are looking for doesn't exist or has been moved.
        </Text>
        <Button
          variant="light"
          size="md"
          leftSection={<IconArrowLeft size={18} />}
          onClick={() => navigate('/')}
        >
          Back to home
        </Button>
      </Stack>
    </Center>
  );
}
