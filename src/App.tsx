import { RouterProvider } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { AuthProvider } from './contexts/AuthContext';
import { router } from './router';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#06b6d4',
    },
    secondary: {
      main: '#22d3ee',
    },
    success: {
      main: '#10b981',
    },
    background: {
      default: '#09090b',
      paper: '#1c1c22',
    },
    divider: 'rgba(255, 255, 255, 0.12)',
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
      letterSpacing: '-0.02em',
      fontSize: '1.75rem',
      '@media (min-width:600px)': {
        fontSize: '2.125rem',
      },
    },
    h6: {
      fontWeight: 600,
      fontSize: '1rem',
      '@media (min-width:600px)': {
        fontSize: '1.25rem',
      },
    },
    body2: {
      lineHeight: 1.6,
      fontSize: '0.8125rem',
      '@media (min-width:600px)': {
        fontSize: '0.875rem',
      },
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#1c1c22',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#1c1c22',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          backgroundImage: 'none',
        },
      },
    },
    MuiTableContainer: {
      styleOverrides: {
        root: {
          backgroundColor: '#1c1c22',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 8,
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: 12,
          '@media (min-width:600px)': {
            padding: 16,
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          minHeight: 44, // Touch-friendly
        },
        sizeSmall: {
          minHeight: 36,
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          padding: 10, // Larger touch target
        },
        sizeSmall: {
          padding: 8,
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'filled',
      },
    },
    MuiDialog: {
      defaultProps: {
        fullWidth: true,
      },
      styleOverrides: {
        paper: {
          backgroundImage: 'none',
          margin: 16,
          width: 'calc(100% - 32px)',
          maxHeight: 'calc(100% - 32px)',
        },
        paperFullScreen: {
          margin: 0,
          width: '100%',
          maxHeight: '100%',
          borderRadius: 0,
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          padding: '12px 16px',
          '@media (min-width:600px)': {
            padding: '16px 24px',
          },
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          padding: '8px 16px',
          '@media (min-width:600px)': {
            padding: '8px 24px',
          },
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: '12px 16px',
          '@media (min-width:600px)': {
            padding: '16px 24px',
          },
        },
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
