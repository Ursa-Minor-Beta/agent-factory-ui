# Agent Factory UI - Development Context

## Tech Stack
- React 19 + TypeScript
- Vite (build tool)
- Material UI (MUI) - free, MIT license
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

### Color Palette (Cyber/Tech Dark Mode)
```typescript
primary: '#06b6d4'      // cyan
secondary: '#22d3ee'    // light cyan
success: '#10b981'      // emerald
background.default: '#09090b'  // near black
background.paper: '#1c1c22'    // dark gray (cards, tables, drawer)
divider: 'rgba(255, 255, 255, 0.12)'
```

### Typography
- Font: Inter (loaded from Google Fonts)
- No uppercase buttons (`textTransform: 'none'`)
- Responsive font sizes (smaller on mobile)

### Component Conventions
- 8px border radius globally
- Cards/tables have visible borders for contrast
- Filled text fields (better visibility in dark mode)
- 44px min-height buttons for touch targets
- Dialogs: full-screen on mobile (`useMediaQuery`)

## File Structure
```
src/
  api/           # API client and endpoint functions
    client.ts    # Fetch wrapper with auth
    index.ts     # API exports (authApi, agentsApi, etc.)
  components/    # Shared components
    Layout.tsx   # Main layout with sidebar
    ProtectedRoute.tsx
    PublicRoute.tsx
  contexts/      # React contexts
    AuthContext.tsx
  pages/         # Page components
    Login.tsx
    Agents.tsx
    Providers.tsx
    ApiKeys.tsx
    Users.tsx
  types/         # TypeScript types
  config/        # Environment config
  router.tsx     # Route definitions
  App.tsx        # Theme and providers
```

## Patterns to Follow

### Adding a New Page
1. Create page component in `src/pages/`
2. Add route in `src/router.tsx`
3. Add navigation item in `src/components/Layout.tsx` (navItems array)
4. Use `useMediaQuery` + `useTheme` for mobile dialogs

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
- Use `{ xs: value, sm: value }` syntax for responsive values
- Dialogs use `fullScreen={isMobile}` pattern
- Reduced padding/spacing on mobile
- Grid breakpoints: xs=12, sm=6, md=4 for cards
