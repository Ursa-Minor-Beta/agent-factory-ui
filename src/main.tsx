import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Handle chunk load errors after deployment (stale JS trying to load missing chunks)
window.addEventListener('error', (event) => {
  if (
    event.message?.includes('Failed to fetch dynamically imported module') ||
    event.message?.includes('Loading chunk') ||
    event.message?.includes('Loading CSS chunk')
  ) {
    const shouldRefresh = window.confirm(
      'A new version of the app is available. Refresh to update?'
    );
    if (shouldRefresh) {
      window.location.reload();
    }
  }
});

// Handle unhandled promise rejections (dynamic import failures)
window.addEventListener('unhandledrejection', (event) => {
  const message = event.reason?.message || '';
  if (
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('Loading chunk')
  ) {
    event.preventDefault();
    const shouldRefresh = window.confirm(
      'A new version of the app is available. Refresh to update?'
    );
    if (shouldRefresh) {
      window.location.reload();
    }
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
