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

### Adding a New Page
1. Create page component in `src/pages/`
2. Add route in `src/router.tsx`
3. Add navigation item in `src/layout/Layout.tsx` (navItems array)
4. Use `useMediaQuery` from `@mantine/hooks` for responsive behavior

### Adding API Endpoints
1. Add function in relevant file under `src/api/`
2. Use the `api` helper from `client.ts`
3. Define TypeScript types in `src/types/`

### Form Pattern
```typescript
const { register, handleSubmit, reset, formState: { errors } } = useForm<FormType>();
// Use reset() when opening dialog with existing data
// Use reset({ field: '' }) when closing dialog
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
