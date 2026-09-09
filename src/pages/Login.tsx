import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  Box,
  Card,
  TextInput,
  PasswordInput,
  Button,
  Title,
  Text,
  Alert,
  Stack,
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { useAuth } from '../contexts/AuthContext';

interface LoginForm {
  email: string;
  password: string;
}

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    setError('');
    setLoading(true);
    try {
      await login(data.email, data.password);
      const redirectTo = searchParams.get('redirect') || '/agents';
      navigate(redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--mantine-color-dark-8)',
      }}
    >
      <Card
        shadow="md"
        padding="xl"
        radius="md"
        style={{
          maxWidth: 400,
          width: '100%',
          margin: '0 16px',
          backgroundColor: 'var(--mantine-color-dark-6)',
        }}
      >
        <Title order={2} ta="center" mb="xs">
          Agent Factory
        </Title>
        <Text c="dimmed" size="sm" ta="center" mb="lg">
          Sign in to your account
        </Text>

        {error && (
          <Alert
            icon={<IconAlertCircle size={16} />}
            color="red"
            mb="md"
            variant="light"
          >
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <Stack>
            <TextInput
              label="Email"
              type="email"
              placeholder="your@email.com"
              autoFocus
              error={errors.email?.message}
              {...register('email', { required: 'Email is required' })}
            />
            <PasswordInput
              label="Password"
              placeholder="Your password"
              error={errors.password?.message}
              {...register('password', { required: 'Password is required' })}
            />
            <Button
              type="submit"
              fullWidth
              loading={loading}
              mt="md"
            >
              Sign In
            </Button>
          </Stack>
        </form>
      </Card>
    </Box>
  );
}
