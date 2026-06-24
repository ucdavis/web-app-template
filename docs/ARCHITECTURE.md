# Development Architecture

## Overview

This template uses:

- ASP.NET Core on port `5165` for API, auth, health checks, and Swagger
- Vite on port `5173` for the React frontend during development
- ASP.NET Core `SpaProxy` so Visual Studio can launch the frontend without a separate `.esproj`
- Vite proxy rules so frontend requests to `/api`, `/login`, `/signin-oidc`, and `/health` are forwarded to ASP.NET Core

In production, ASP.NET Core serves the built frontend from `server/wwwroot`.

Cloud deployments use Azure App Service, Azure SQL, workspace-based Application Insights, and Log Analytics. The deployment scaffold supports only `test` and `prod` environments.

## Development Request Flow

### Visual Studio startup flow

```text
Visual Studio F5
    ↓
ASP.NET Core profile (:5165)
    ↓
SpaProxy ensures Vite is running
    ↓
Browser is redirected to :5173
```

### Runtime request flow

```text
Browser → :5173 (Vite)
            ↓
    ┌───────┴──────────────┐
    │                      │
frontend assets/routes   /api, /login, /signin-oidc, /health
    │                      │
    ↓                      ↓
 React + HMR         Proxy to :5165 (ASP.NET Core)
```

This keeps frontend hot reload fast while leaving backend auth and API behavior inside ASP.NET Core.

## Production Request Flow

```text
Browser → :5165 (ASP.NET Core)
            ↓
    ┌───────┴────────┐
    │                │
 /api, auth, health  static files + SPA fallback
    │                │
    ↓                ↓
 Controllers      wwwroot/index.html + assets
```

## Azure Hosting Flow

```text
GitHub Actions or local deploy script
    ↓
Build React frontend + publish ASP.NET Core app
    ↓
Zip deploy to Azure App Service
    ↓
App Service serves /api, auth, health, static assets, and SPA fallback
    ↓
Azure SQL, Application Insights, and Log Analytics
```

Each deployment validates the expected subscription ID and requires the target resource group to end with the matching environment suffix before resources are created.

GitHub deployments authenticate to Azure with OIDC through a per-environment Entra app registration. The one-time bootstrap template creates the app registration, service principal, GitHub Environment federated credential, and optional Contributor assignment on the environment resource group.

## Key Files

### `server/server.csproj`

Responsibilities:

- Declares backend dependencies
- Configures `SpaProxy`
- Includes the `client/` tree as project items so frontend files appear in Visual Studio without a separate JavaScript project
- Runs the client build during `dotnet publish` and copies `client/dist` into `wwwroot`

Important settings:

```xml
<SpaRoot>..\client\</SpaRoot>
<SpaProxyLaunchCommand>npm run dev</SpaProxyLaunchCommand>
<SpaProxyServerUrl>http://localhost:5173</SpaProxyServerUrl>
```

### `server/Properties/launchSettings.json`

Responsibilities:

- Enables `Microsoft.AspNetCore.SpaProxy` for the development profiles
- Defines the backend application URLs used by `dotnet run`, `dotnet watch`, and Visual Studio

### `client/vite.config.ts`

Responsibilities:

- Runs the frontend dev server on port `5173`
- Proxies backend routes to ASP.NET Core
- Detects either `ASPNETCORE_URLS` or `ASPNETCORE_HTTPS_PORT` so the same config works for normal `dotnet watch` and IIS Express

### `server/Program.cs`

Responsibilities:

- Configures the ASP.NET Core middleware pipeline
- Serves static files in all environments
- Reserves SPA fallback behavior for production, where the built frontend lives in `wwwroot`

### `infrastructure/azure/main.bicep`

Responsibilities:

- Creates Azure SQL, Linux App Service, Log Analytics, and workspace-based Application Insights
- Applies generic runtime settings for auth, notifications, SMTP, database connectivity, and optional OTLP export
- Emits deployment outputs consumed by scripts and GitHub Actions

### `infrastructure/azure/github-oidc.bicep`

Responsibilities:

- Creates the per-environment GitHub OIDC deployment identity
- Adds the federated credential for `repo:<owner>/<repo>:environment:<env>`
- Optionally assigns Contributor on the target resource group

### `.github/workflows/ci-cd.yml`

Responsibilities:

- Validates pull requests
- Deploys pushes to `main` to the `test` GitHub Environment
- Supports manual deployments to `test` or `prod`

### `.github/workflows/deploy-azure-appservice.yml`

Responsibilities:

- Provides the reusable App Service deployment job
- Builds, tests, publishes, and packages the app
- Logs in to Azure with GitHub OIDC
- Optionally deploys infrastructure and then zip deploys the app package

## Development Workflows

### Visual Studio on Windows

1. Open the solution.
2. Set `server` as the startup project.
3. Press `F5`.

`SpaProxy` starts Vite if needed and redirects the browser to `http://localhost:5173`.

### Command line

Run both processes:

```bash
npm start
```

Run only the backend:

```bash
dotnet watch --project server/server.csproj
```

Run only the frontend:

```bash
cd client
npm run dev
```

### Local Azure deploy

For local deploy commands and required settings, see [Azure Deployment Setup](../README.customization.md#5-azure-deployment-setup).

## Why This Replaced `.esproj`

The previous `.esproj` setup published correctly, but it caused `dotnet watch` failures because the .NET CLI still tried to traverse the JavaScript project type during watch runs.

The current approach keeps the useful parts:

- Visual Studio can still launch Vite automatically
- Publish still builds and includes the frontend assets
- Frontend files still appear in Visual Studio

And removes the CLI pain point:

- `dotnet watch --project server/server.csproj` no longer fails on a referenced `.esproj`

## Troubleshooting

### Visual Studio starts the backend but not the frontend

Check:

- Node.js is installed and available on `PATH`
- `server` is the startup project
- the launch profile includes `ASPNETCORE_HOSTINGSTARTUPASSEMBLIES=Microsoft.AspNetCore.SpaProxy`

### Frontend loads but API calls fail

Check:

- ASP.NET Core is running on `:5165`
- the proxy targets in `client/vite.config.ts` still match the backend URL
- `/health` responds on the backend

### Backend exits immediately during startup

This template runs database initialization at startup. If SQL Server is not available, the app exits before the browser handoff completes.

Common local fix:

```bash
npm run db:up
```

For cloud first-start migration behavior, see [First deployment](../README.customization.md#first-deployment).

### Auth cookies fail after scaling out

For the data-protection scale-out caveat, see [First deployment](../README.customization.md#first-deployment).

### Changing ports

If you change the development ports, update all of these together:

1. `server/Properties/launchSettings.json`
2. `server/server.csproj` (`<SpaProxyServerUrl>`)
3. `client/vite.config.ts`
4. `.devcontainer/devcontainer.json`
