# Agent Factory UI - Development Context

## Tech Stack
- React 19 + TypeScript
- Vite (build tool)
- Mantine UI v9.6.0 - free, MIT license
- Tabler Icons (@tabler/icons-react)
- React Router v7 (routing)
- React Hook Form (forms)
- Native fetch (no axios)

## Architecture Decisions

### Authentication
- HTTP-only cookies for tokens (not localStorage)
- Auto-refresh token mechanism with mutex pattern in `src/api/client.ts`
- Auth state managed via React Context (`src/contexts/AuthContext.tsx`)
- Protected routes redirect to `/login?redirect=<original_url>`
- Skip auth endpoints from token refresh logic

### API Client
- All API calls go through `src/api/client.ts`
- Centralized error handling with `ApiError` class
- Automatic 401 handling with token refresh
- Always use `credentials: 'include'` for cookies

### Routing
- `ProtectedRoute` component for auth-required pages
- `PublicRoute` component for login (redirects if already logged in)
- Admin-only routes use `adminOnly` prop on `ProtectedRoute`

## Theme & Styling

### Mantine Theme (Cyber/Tech Dark Mode)
- Dark color scheme by default
- Primary color: cyan
- Uses Mantine CSS variables (e.g., `var(--mantine-color-dark-8)`)
- Glassmorphism effects with `backdropFilter: 'blur(12px)'` and semi-transparent backgrounds

### Typography
- Font: Inter (loaded from Google Fonts)
- Responsive font sizes via Mantine's responsive props

### Component Conventions
- Use Mantine components: `Box`, `Card`, `Paper`, `Group`, `Stack`, `Text`, etc.
- `radius="lg"` for rounded corners on cards
- `withBorder` prop for visible borders
- Use `ActionIcon` for icon buttons
- Modals: use `centered` prop, `size="sm"` for confirmations
- Use `@mantine/hooks` for `useMediaQuery`, `useDisclosure`, etc.

## File Structure
```
src/
  api/           # API client and endpoint functions
  components/    # Shared components
  contexts/      # React contexts
  layout /       # Main layout with sidebar
  pages/         # Page components
  types/         # TypeScript types
  config/        # Environment config
  router.tsx     # Route definitions
  App.tsx        # Theme and providers
```

## Patterns to Follow

### Data Filtering
- **Server-side filtering only** - Never use client-side filtering with `useMemo`
- Pass search/filter parameters to API calls and let the backend handle filtering
- Use debounced search state (300ms) before triggering API calls

### Modal Components
- **Extract modals into separate files** - Never inline modals in page components
- Create dedicated modal components (e.g., `CollectionModal.tsx`, `CollectionDeleteModal.tsx`)
- Modal components should receive `opened`, `onClose`, and relevant data/handlers as props

### Global Modals with URL State
For resource detail modals that should be accessible from multiple pages, use the global modal pattern:

**Architecture:**
- Modal is placed once in `Layout.tsx` with lazy loading (inside router context)
- Modal reads state directly from URL query parameters
- Components only use the hook to set URL parameters
- No need to pass props or render modal in each page

**Benefits:**
- Single source of truth - only one modal instance
- Automatic deep linking - works from any page
- Better code splitting with lazy loading
- Cleaner page components - no modal markup
- Child navigation works automatically (just URL updates)

**Implementation:**

1. **Create modal that reads from URL:**
```typescript
// src/components/RunDetailsModal/RunDetailsModal.tsx
export function RunDetailsModal() {
  const { runId, isOpen, closeRunDetails, openRunDetails } = useRunDetailsModal();
  // Modal reads runId from URL, no props needed

  return (
    <Modal opened={isOpen} onClose={closeRunDetails}>
      {/* Modal content, can navigate to child resources via openRunDetails */}
    </Modal>
  );
}
```

2. **Add to Layout.tsx with lazy loading:**
```typescript
import { lazy, Suspense } from 'react';

const RunDetailsModal = lazy(() =>
  import('../components/RunDetailsModal').then((module) => ({
    default: module.RunDetailsModal,
  }))
);

export function Layout() {
  return (
    <AppShell>
      {/* ... navbar ... */}
      <AppShell.Main>
        <Suspense fallback={<Loader />}>
          <Outlet />
        </Suspense>
      </AppShell.Main>

      {/* Global modals - read state from URL */}
      <Suspense fallback={null}>
        <RunDetailsModal />
      </Suspense>
    </AppShell>
  );
}
```

3. **Use hook in any component:**
```typescript
import { useRunDetailsModal } from '../../components/RunDetailsModal';

const { openRunDetails } = useRunDetailsModal();

// That's it! No modal markup needed
<Button onClick={() => openRunDetails('run-123')}>View Run</Button>
```

**Creating a new global modal:**
1. Create modal component that reads from URL (no props)
2. Create custom hook (e.g., `useRecordDetailsModal.ts`) that:
   - Uses `useSearchParams` from React Router
   - Returns `{ id, isOpen, openModal, closeModal }`
3. Add to `Layout.tsx` with lazy loading (must be inside router context)
4. Export hook from index file

**Use for:**
- Resource detail views (RunDetailsModal, AgentDetailsModal, RecordDetailsModal)
- Any modal needed across multiple pages
- Modals where deep linking is important

**Don't use for:**
- Page-specific modals (create/edit forms, delete confirmations)
- Modals that need different behavior per page
- Simple confirmation dialogs

### Adding a New Page
1. Create page component in `src/pages/`
2. Add route in `src/router.tsx`
3. Add navigation item in `src/layout/Layout.tsx` (navItems array)
4. Use `useMediaQuery` from `@mantine/hooks` for responsive behavior
5. **Update README.md** - Add the new feature to the Features section

### Adding API Endpoints
1. Add function in relevant file under `src/api/`
2. Choose the right helper from `client.ts`:
   - `api.get/post/put/delete` - for standard endpoints that return `{ data: T }` format
   - `fetchWithRefresh` - for endpoints that return raw JSON (e.g., `/api`, `/health`)
3. Define TypeScript types in `src/types/` or in the api file

```typescript
// Standard endpoint with { data: T } response
getItems: () => api.get<Item[]>('/api/items')

// Raw JSON response (no data wrapper)
getHealth: async (): Promise<HealthCheck> => {
  const response = await fetchWithRefresh('/health');
  return response.json();
}
```

### Form Pattern
```typescript
const { register, handleSubmit, reset, formState: { errors } } = useForm<FormType>();
// Use reset() when opening dialog with existing data
// Use reset({ field: '' }) when closing dialog
```

### State Updates After API Calls
Prefer optimistic updates over refetching:
```typescript
// Good - optimistic update
await api.delete(id);
setItems((prev) => prev.filter((item) => item.id !== id));

// Good - optimistic update after mutation
await api.update(id, { title });
setItems((prev) => prev.map((item) =>
  item.id === id ? { ...item, title } : item
));

// Avoid - unnecessary refetch
await api.delete(id);
loadItems(); // Extra API call
```

## Backend API
- Base URL: configured via `VITE_API_URL` env var
- All endpoints prefixed with `/api/`
- Auth endpoints: `/api/auth/login`, `/api/auth/logout`, `/api/auth/refresh`, `/api/auth/me`
- Response format: `{ data: T }` on success, `{ error: { code, message } }` on error

## Mobile Responsiveness
- Use `useMediaQuery('(max-width: 768px)')` from `@mantine/hooks`
- Mantine responsive props: `visibleFrom="sm"`, `hiddenFrom="sm"`
- Use `SimpleGrid` with `cols={{ base: 1, sm: 2, md: 3 }}` for responsive grids
- Modals: use `fullScreen` prop on mobile if needed
- Reduced padding/spacing on mobile via conditional styles
