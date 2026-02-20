# GitHub Copilot Instructions

This is a full-stack web application template using modern React and .NET technologies. Please follow these guidelines when generating code suggestions:

## Architecture Overview

- **Frontend**: React 19 with TypeScript in Vite development environment
- **Backend**: ASP.NET Core 10.0 Web API
- **Development Proxy**: YARP reverse proxy routes requests to Vite dev server (development only)
- **Development**: Hot reload for both frontend (HMR) and backend (dotnet watch)
- **Single Port Development**: All traffic flows through port 5165 in development

## Frontend Technology Stack

### Build Tools & Development

- **Vite** (`^7.1.5`) - Primary build tool and dev server (port 5173)
- **TypeScript** (`^5.9.2`) - Primary language for all React components
- **Node.js** `>=22.0.0` - Runtime requirement

### React & Routing

- **React** `^19.1.1` with **React DOM** `^19.1.1`
- **TanStack Router** (`^1.132.33`) - File-based routing system
  - Routes are in `src/routes/` directory
  - Auto-generated route tree in `routeTree.gen.ts`
  - Uses router context with QueryClient integration
  - Default preload strategy: `'intent'`
  - Router devtools available in development

### State Management & Data Fetching

- **TanStack Query** (`^5.90.2`) - Server state management
  - QueryClient configured with React Query devtools
  - Integrated with router context
  - Default preload stale time: 0 (always fresh)

### Forms & Tables

- **TanStack React Form** (`^1.23.5`) - Form state management
- **TanStack React Table** (`^8.21.3`) - Table/data grid functionality

### Styling & UI

- **Tailwind CSS** (`^4.1.14`) - Utility-first CSS framework
- **DaisyUI** (`^5.1.27`) - Tailwind CSS component library
- **UC Davis Gunrock Tailwind** (`^2.4.0`) - Custom design system
- CSS imports structure:
  ```css
  @import "tailwindcss";
  @plugin "daisyui";
  @import "@ucdavis/gunrock-tailwind/imports.css";
  ```

### Code Quality & Linting

- **ESLint** (`^9.35.0`) with custom config (`@nkzw/eslint-config`)
- **Prettier** (`^3.6.2`) - Code formatting
- **TanStack ESLint plugins** for Query and Router
- **Vitest** (`^3.2.4`) - Testing framework

### Path Aliases

- `@/` resolves to `./src/`

## Backend Technology Stack

### Framework & Runtime

- **ASP.NET Core 10.0** - Web API framework
- **.NET 10.0** - Target framework
- **C#** with nullable reference types enabled

### Authentication & Authorization

- **Microsoft Identity Web** (`^3.14.1`) - Authentication integration

### Monitoring & Observability

- **OpenTelemetry** - Distributed tracing and metrics
  - OTLP exporter
  - ASP.NET Core instrumentation
  - HTTP instrumentation

### Development Tools

- **Swashbuckle** (`^6.4.0`) - Swagger/OpenAPI documentation
- **DotNetEnv** (`^3.1.1`) - Environment variable management
- **YARP.ReverseProxy** (`^2.3.0`) - Development proxy for Vite integration

## Development Patterns

### Development Request Flow

**Development mode**:
```
Browser → :5165 (ASP.NET Core)
            ↓
    ┌───────┴────────┐
    │                │
/api/*          everything else
    │                │
    ↓                ↓
Controllers    YARP Proxy → :5173 (Vite)
```

**Production mode**:
```
Browser → :5165 (ASP.NET Core)
            ↓
    ┌───────┴────────┐
    │                │
/api/*          everything else
    │                │
    ↓                ↓
Controllers    Static Files (wwwroot/)
```

### Project Structure

```
/
├── client/          # Vite React app
│   ├── src/
│   │   ├── routes/  # TanStack Router file-based routes
│   │   ├── queries/ # TanStack Query hooks
│   │   ├── lib/     # Utility functions
│   │   └── shared/  # Reusable components
└── server/          # ASP.NET Core API
    ├── Controllers/
    ├── Helpers/
    ├── Properties/
    └── Program.cs   # YARP proxy configuration in Development mode
```

### Routing Conventions

- File-based routing in `src/routes/`
- Protected routes under `(authenticated)/` directory
- Route components should use TanStack Router hooks
- Integrate with React Query for data fetching

### Component Guidelines

- Use TypeScript for all components
- Prefer function components with hooks
- Use Tailwind CSS classes for styling
- Leverage DaisyUI components when appropriate
- Follow UC Davis Gunrock design system patterns

### Data Fetching

- Use TanStack Query for server state
- Create custom hooks in `queries/` directory
- Integrate query invalidation with router navigation
- Use the configured QueryClient from router context

### Form Handling

- Use TanStack React Form for complex forms
- Combine with TanStack Query for server interactions
- Follow validation patterns consistent with the stack

### API Integration

- **Development mode**: Backend (port 5165) uses YARP to proxy non-API requests to Vite (port 5173)
- **Production mode**: Backend serves static files from `wwwroot/`
- Backend serves from `/api` routes (both modes)
- Authentication handled via Microsoft Identity Web
- Use type-safe API client patterns
- All requests go through port 5165 (single-origin, cookies work correctly)

### Development Commands

- `npm run dev` - Start both backend and Vite dev server concurrently (recommended)
- `npm start` - Alternative command using npm-run-all (legacy)
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `dotnet watch --project server/server.csproj` - Start backend only (port 5165)
- `cd client && npm run dev` - Start Vite only (port 5173)

### Testing

- `cd client && npm test` - Run the client Vitest suite once
- `cd client && npm run test:watch` - Watch client tests while developing
- `dotnet test` - Execute the .NET server test project

## Code Generation Preferences

1. **Always use TypeScript** - No plain JavaScript files
2. **Prefer functional components** - Use hooks over class components
3. **Use Tailwind CSS classes** - Avoid writing custom CSS unless necessary
4. **Leverage TanStack ecosystem** - Use Router, Query, Form, and Table together
5. **Follow file-based routing** - Create route files in appropriate directories
6. **Type-safe API calls** - Generate or maintain TypeScript interfaces for API responses
7. **Use modern React patterns** - Hooks, context, and concurrent features
8. **DaisyUI components** - Prefer DaisyUI components over custom implementations
9. **Environment-aware code** - Handle development vs production differences
10. **Responsive design** - Use Tailwind's responsive utilities

## Common Patterns

### Route Component Example (authenticated route, the default pattern)

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/(authenticated)/example")({
  component: ExampleComponent,
});

function ExampleComponent() {
  const { data } = useQuery({
    queryKey: ["example"],
    // API calls go to same origin (:5165) - authentication cookies work automatically
    queryFn: () => fetch("/api/example").then((res) => res.json()),
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
public class ExampleController : ApiControllerBase
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
   - Primary port: **5165** (ASP.NET Core - use this for all development)
   - Internal port: **5173** (Vite dev server - proxied, don't access directly)
   - Access the app at `http://localhost:5165` (not 5173)

2. **API Calls**:
   - Always use relative paths like `/api/example` (never `http://localhost:5165/api/...`)
   - Same-origin requests mean authentication cookies work automatically
   - No CORS configuration needed

3. **YARP Proxy Configuration**:
   - Located in `server/Program.cs`
   - Only active in Development environment
   - Routes all non-API/health/swagger requests to Vite
   - Catch-all route has `Order = int.MaxValue` (lowest priority)

4. **Hot Module Replacement**:
   - Vite HMR works through the proxy
   - WebSocket connections are properly proxied
   - Frontend changes reflect immediately
   - Backend changes trigger `dotnet watch` restart

5. **Production Build**:
   - Run `cd client && npm run build` to generate static files in `client/dist/`
   - Copy contents to `server/wwwroot/`
   - Backend serves static files directly (no proxy)
   - Fallback to `index.html` enables client-side routing

When generating code, ensure it follows these patterns and integrates well with the existing technology stack.
