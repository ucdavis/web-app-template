# GitHub Copilot Instructions

This is a full-stack web application template using modern React and .NET technologies. Please follow these guidelines when generating code suggestions:

## Docker sandbox for investigation

Use the [Docker sandbox quick start](../README.md#run-the-docker-sandbox) to investigate the current checkout with local sign-in and sample data. See [the sandbox guide](../docs/SANDBOX.md) for role checks, logs, alternate ports, and browser investigation.

## Architecture Overview

- **Frontend**: React 19 with TypeScript in Vite development environment
- **Backend**: ASP.NET Core 10.0 Web API
- **Development**: SPA proxy setup with hot reload

## Frontend Technology Stack

### Build Tools & Development

- **Vite** (`^7.1.5`) - Primary build tool and dev server (port 5173)
- **TypeScript** (`^5.9.2`) - Primary language for all React components
- **Node.js** - See [development setup](../README.md#set-up-for-development) for runtime requirements and setup.

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
- **UC Davis Gunrock Tailwind** - See [Styling & UI](../AGENTS.md#styling--ui) for the design system.
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
- Client testing: see [Client tests](../README.md#client-tests).

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

See [Development Tools](../AGENTS.md#development-tools) for backend tooling.

## Development Patterns

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
    └── Properties/
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

- API endpoints proxy through Vite dev server
- Backend serves from `/api` routes
- Authentication modes are documented under [Auth Configuration](../README.md#auth-configuration)
- Use type-safe API client patterns

### Development Commands

See [development setup](../README.md#set-up-for-development) for startup commands and [Development Commands](../AGENTS.md#development-commands) for component-specific commands.

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

When generating code, ensure it follows these patterns and integrates well with the existing technology stack.
