# GitHub Copilot Instructions

This is a full-stack web application template using modern React and .NET technologies. Please follow these guidelines when generating code suggestions.

## Architecture Overview

- **Frontend**: React 19 with TypeScript, built with Vite
- **Backend**: ASP.NET Core 10 Web API
- **Development Flow**: Vite serves the frontend on port `5173` and proxies API/auth/health requests to ASP.NET Core on port `5165`
- **Visual Studio Integration**: ASP.NET Core `SpaProxy` can launch Vite for Visual Studio users
- **Production Flow**: ASP.NET Core serves the built frontend from `server/wwwroot`

## Frontend Technology Stack

### Build Tools & Development

- **Vite** (`^7.1.5`) - Primary build tool and dev server on port `5173`
- **TypeScript** (`^5.9.2`) - Primary language for all React components
- **Node.js** `>=22.0.0` - Runtime requirement

### React & Routing

- **React** `^19.1.1` with **React DOM** `^19.1.1`
- **TanStack Router** (`^1.132.33`) - File-based routing system
  - Routes live in `src/routes/`
  - The generated route tree is in `routeTree.gen.ts`
  - Router context includes the shared `QueryClient`
  - Default preload strategy is `'intent'`
  - Router devtools are enabled in development

### State Management & Data Fetching

- **TanStack Query** (`^5.90.2`) - Server state management
  - `QueryClient` is created in `src/main.tsx`
  - React Query devtools are enabled in development
  - Router preloading uses `defaultPreloadStaleTime: 0`

### Forms & Tables

- **TanStack React Form** (`^1.23.5`) - Form state management
- **TanStack React Table** (`^8.21.3`) - Table/data grid functionality

### Styling & UI

- **Tailwind CSS** (`^4.1.14`) - Utility-first CSS framework
- **DaisyUI** (`^5.1.27`) - Tailwind CSS component library
- **UC Davis Gunrock Tailwind** (`^2.4.0`) - Custom design system
- CSS imports are structured like:
  ```css
  @import "tailwindcss";
  @plugin "daisyui";
  @import "@ucdavis/gunrock-tailwind/imports.css";
  ```

### Code Quality & Linting

- **ESLint** (`^9.35.0`) with custom config (`@nkzw/eslint-config`)
- **Prettier** (`^3.6.2`) - Code formatting
- **TanStack ESLint plugins** for Query and Router
- **Vitest** (`^4.0.5`) - Testing framework
- **Testing Library** + **jsdom** - Component and route tests

### Path Aliases

- `@/` resolves to `./src/`

## Backend Technology Stack

### Framework & Runtime

- **ASP.NET Core 10.0** - Web API framework
- **.NET 10.0** - Target framework
- **C#** with nullable reference types enabled

### Authentication & Authorization

- **Microsoft Identity Web** (`3.14.1`) - Authentication integration
- Cookie-based auth flow is exposed through backend endpoints like `/login` and `/signin-oidc`

### Monitoring & Observability

- **OpenTelemetry** - Distributed tracing and metrics
  - OTLP exporter
  - ASP.NET Core instrumentation
  - HTTP instrumentation

### Development Tools

- **Swashbuckle** (`6.9.0`) - Swagger/OpenAPI documentation
- **Dotenv.Extensions.Microsoft.Configuration** (`3.1.0`) - `.env` configuration loading
- **Microsoft.AspNetCore.SpaProxy** (`10.0.1`) - Visual Studio dev-time frontend launch support

## Development Patterns

### Development Request Flow

**Command-line development**:
```text
Browser → :5173 (Vite)
            ↓
    ┌───────┴────────────────────────────┐
    │                                    │
frontend assets/routes   /api, /login, /signin-oidc, /health
    │                                    │
    ↓                                    ↓
 React + HMR                 Vite proxy → :5165 (ASP.NET Core)
```

**Visual Studio development**:
```text
Visual Studio F5
    ↓
ASP.NET Core profile (:5165)
    ↓
SpaProxy ensures Vite is running
    ↓
Browser is redirected to :5173
```

**Production mode**:
```text
Browser → :5165 (ASP.NET Core)
            ↓
    ┌───────┴────────┐
    │                │
/api/*          everything else
    │                │
    ↓                ↓
Controllers    Static Files + SPA fallback (wwwroot)
```

### Project Structure

```text
/
├── client/              # Vite React app
│   ├── src/
│   │   ├── routes/      # TanStack Router file-based routes
│   │   ├── queries/     # TanStack Query hooks
│   │   ├── lib/         # API helpers and utilities
│   │   ├── shared/      # Reusable UI/auth components
│   │   └── test/        # Client tests
├── server/              # ASP.NET Core host app
│   ├── Controllers/
│   ├── Helpers/
│   ├── Properties/
│   ├── Program.cs       # Backend startup and middleware pipeline
│   └── server.csproj    # SpaProxy and publish integration
├── server.core/         # Shared server domain/data code
└── tests/server.tests/  # .NET server tests
```

### Routing Conventions

- File-based routing lives in `src/routes/`
- Protected routes are grouped under `(authenticated)/`
- The authenticated layout preloads the current user via `ensureQueryData(meQueryOptions())`
- Route components should use TanStack Router hooks and integrate cleanly with React Query

### Component Guidelines

- Use TypeScript for all components
- Prefer function components with hooks
- Use Tailwind CSS classes for styling
- Leverage DaisyUI components when appropriate
- Follow UC Davis Gunrock design system patterns

### Data Fetching

- Use TanStack Query for server state
- Create custom hooks and query options in `queries/`
- Prefer the shared `fetchJson` helper in `src/lib/api.ts`
- Keep API calls relative, for example `/api/example`
- Integrate query usage with router loading when route data is required up front

### Authentication Conventions

- In development, the browser talks to Vite on `:5173`, and Vite proxies auth and API requests to ASP.NET Core on `:5165`
- The authenticated route tree fetches `/api/user/me` before rendering child routes
- `fetchJson` redirects `401` responses to `/login?returnUrl=...` unless explicitly disabled
- Avoid hardcoding backend origins; use relative URLs so the same code works in development and production

### Form Handling

- Use TanStack React Form for complex forms
- Combine form state with TanStack Query mutations for server interactions
- Follow existing validation and submission patterns where present

### API Integration

- **Development mode**: Vite proxies `/api`, `/login`, `/signin-oidc`, and `/health` to ASP.NET Core
- **Production mode**: ASP.NET Core serves static files from `wwwroot/` and handles `/api` routes directly
- Authentication is handled by Microsoft Identity Web on the backend
- Use type-safe API client patterns for request and response shapes
- Prefer relative paths like `/api/example`, never hardcoded `http://localhost:5165/api/example`

### Development Commands

- `npm start` - Start backend and frontend together from the repo root
- `npm run start:server` - Start only the ASP.NET Core backend with `dotnet watch`
- `npm run start:client` - Start only the Vite dev server
- `npm run db:up` - Start the local SQL Server container
- `npm run db:down` - Stop the local SQL Server container
- `npm run db:logs` - Tail SQL Server logs
- `cd client && npm run build` - Build the frontend for production
- `cd client && npm run lint` - Run ESLint
- `cd client && npm test` - Run client tests once
- `cd client && npm run test:watch` - Watch client tests
- `dotnet test` - Execute the .NET test project(s)

### Testing

- Client tests use Vitest, jsdom, and Testing Library
- Server tests live under `tests/server.tests/`
- Frontend route work often needs auth-aware mocking because authenticated routes preload `/api/user/me`

## Code Generation Preferences

1. **Always use TypeScript** - No plain JavaScript files for app code
2. **Prefer functional components** - Use hooks over class components
3. **Use Tailwind CSS classes** - Avoid custom CSS unless necessary
4. **Leverage the TanStack ecosystem** - Router, Query, Form, and Table are the default tools
5. **Follow file-based routing** - Add route files in the correct `src/routes/` location
6. **Use type-safe API calls** - Maintain TypeScript interfaces for API responses
7. **Use modern React patterns** - Hooks, context, and current React APIs
8. **Prefer existing shared helpers** - Reuse `fetchJson`, query options, auth context, and shared components before adding new abstractions
9. **Environment-aware code** - Keep development and production behavior aligned through relative URLs and existing proxy/static-file patterns
10. **Responsive design** - Use Tailwind responsive utilities

## Common Patterns

### Route Component Example

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';

export const Route = createFileRoute('/(authenticated)/example')({
  component: ExampleComponent,
});

function ExampleComponent() {
  const { data } = useQuery({
    queryKey: ['example'],
    queryFn: () => fetch('/api/example').then((res) => res.json()),
  });

  return (
    <div className="container mx-auto p-4">
      {/* DaisyUI and Tailwind styling */}
    </div>
  );
}
```

### API Controller Pattern

```csharp
[ApiController]
[Route("api/[controller]")]
public class ExampleController : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetExample()
    {
        // Implementation
    }
}
```

## Important Development Notes

1. **Port Usage**:
   - Backend runs on `http://localhost:5165`
   - Vite runs on `http://localhost:5173`
   - For command-line development, use `http://localhost:5173`
   - Visual Studio may launch through the backend profile and redirect to `:5173` via `SpaProxy`

2. **API Calls**:
   - Always use relative paths like `/api/example`
   - Do not hardcode localhost ports into frontend fetch calls
   - Relative paths keep auth and proxy behavior correct in both development and production

3. **Proxy Configuration**:
   - Development proxying lives in `client/vite.config.ts`
   - `SpaProxy` settings live in `server/server.csproj` and launch settings
   - `server/Program.cs` does not proxy Vite in development

4. **Hot Reload**:
   - Vite HMR runs directly on `:5173`
   - Backend changes trigger `dotnet watch` restarts on `:5165`
   - Visual Studio users can rely on `SpaProxy` to launch the frontend automatically

5. **Production Build**:
   - `cd client && npm run build` outputs frontend assets to `client/dist/`
   - `dotnet publish` also builds the client and copies `client/dist/` into `wwwroot`
   - ASP.NET Core serves static files directly in production
   - SPA fallback to `index.html` is enabled only outside development

When generating code, ensure it follows these patterns and integrates well with the existing technology stack.
