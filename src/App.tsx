import { RouterProvider } from 'react-router-dom';
import { MantineProvider, createTheme } from '@mantine/core';
import { AuthProvider } from './contexts/AuthContext';
import { router } from './router';
import '@mantine/core/styles.css';

const theme = createTheme({
  primaryColor: 'cyan',
  colors: {
    dark: [
      '#C1C2C5',
      '#A6A7AB',
      '#909296',
      '#5c5f66',
      '#373A40',
      '#2C2E33',
      '#1c1c22', // paper/card background
      '#141417',
      '#09090b', // main background
      '#050506',
    ],
  },
  fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  radius: {
    xs: '4px',
    sm: '6px',
    md: '8px',
    lg: '12px',
    xl: '16px',
  },
  defaultRadius: 'md',
  components: {
    Button: {
      defaultProps: {
        size: 'sm',
      },
    },
    ActionIcon: {
      defaultProps: {
        size: 'sm',
      },
    },
    TextInput: {
      defaultProps: {
        size: 'sm',
      },
    },
    Select: {
      defaultProps: {
        size: 'sm',
      },
    },
    PasswordInput: {
      defaultProps: {
        size: 'sm',
      },
    },
  },
});

function App() {
  return (
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </MantineProvider>
  );
}

export default App;
