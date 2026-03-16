# Web App Template

A full-stack web application template featuring a .NET 10 backend with React/Vite frontend, using OIDC authentication with Microsoft Entra ID.

## Architecture

- **Backend**: .NET 10 Web API with ASP.NET Core
- **Frontend**: React 19 with Vite, TypeScript, and TanStack Router/Query/Table
- **Authentication**: OIDC with Microsoft Entra ID (Azure AD)
- **Styling**: Tailwind CSS
- **Development**: Hot reload for both frontend and backend
- **Development Integration**: ASP.NET Core `SpaProxy` launches Vite for Visual Studio users, while Vite proxies API and auth routes back to ASP.NET Core during development

## Quick Start

1. **Clone the repository**

   ```bash
   git clone https://github.com/ucdavis/web-app-template/
   cd web-app-template
   ```

2. **Open In DevContainer**

   - Open the project folder in Visual Studio Code.
   - Click the prompt to open in container (or manually select from the command palette).

_Using the DevContainer is optional, but it will get you the right version of dotnet + node, plus install all dependencies and setup a local SQL instance for you_

3. **Start the application**

   **Prerequisites outside DevContainer**:
   - Install the .NET 10 SDK.
   - For Visual Studio on Windows, use Visual Studio 2026 version 18.0 or later for `net10.0` support.

   **Inside DevContainer**: The application starts automatically via `postStartCommand`
   
   **Outside DevContainer**:
   ```bash
   npm run db:up
   npm start
   ```
   
   `npm run db:up` starts the SQL Server container from the same Compose file used by the DevContainer. `npm start` starts the .NET backend on port `5165`, waits for it to become healthy, and then starts the Vite dev server on port `5173`.

   **Visual Studio (Windows)**:
   - Open `app.sln`.
   - Set the `server` project as the startup project.
   - Press `F5`.
   - `SpaProxy` starts Vite if needed and redirects the browser to the frontend dev server.

4. **Access the application**

In development, the frontend runs from **http://localhost:5173** and proxies backend requests to ASP.NET Core on **http://localhost:5165**.

- **Main App**: http://localhost:5173
- **Backend API**: http://localhost:5165/api/*
- **API Documentation (Swagger)**: http://localhost:5165/swagger
- **Health Check**: http://localhost:5165/health
- **Visual Studio F5**: launches through the backend profile, then redirects to the Vite dev server on `:5173`

### Database configuration

The backend requires a SQL Server connection string.

- Outside DevContainer, the default development connection points to the SQL Server container published on `localhost:14333`.
- Inside DevContainer, `devcontainer.json` overrides `DB_CONNECTION` to use the internal Docker hostname `sql:1433`.

When you want to specify your own DB connection, provide it by setting the `DB_CONNECTION` environment variable (for example in a `.env` file) or by updating `ConnectionStrings:DefaultConnection` in `appsettings.*.json` (`.env` is recommended)

To run only the database outside DevContainer:

```bash
npm run db:up
```

This runs the `sql` service from `.devcontainer/docker-compose.yml` and exposes SQL Server on `localhost:14333`.

Useful companion commands:

- `npm run db:logs` to watch SQL Server startup logs
- `npm run db:down` to stop the container when you're done

### Auth Configuration

We use OIDC with Microsoft Entra ID (Azure AD) for authentication. The auth flow doesn't use any secrets and the settings in `appsettings.*.json` are sufficient for local development.

When you are ready to get your own, go to [Microsoft Entra ID](https://entra.microsoft.com/) and create a new application registration. For local development, set the redirect URL to the origin you actually launch from:

- `http://localhost:5173/signin-oidc` for the default Vite dev flow
- `http://localhost:5165/signin-oidc` if you are testing directly against the backend origin
- `https://localhost:44322/signin-oidc` if you use the default IIS Express profile

Check the box for "ID tokens".

You might also want to set the publisher domain to ucdavis.edu and fill in the other general branding info.

### Health check

The health check endpoint (`/health`) is configured to return the status of the application and its dependencies. It includes a database health check to ensure the SQL Server connection is healthy. See [Health Checks](https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/health-checks?view=aspnetcore-10.0#entity-framework-core-dbcontext-probe).

## Development

### Development Architecture

In development mode:

- ASP.NET Core runs on port `5165`
- Vite serves the frontend on port `5173`
- Visual Studio uses `SpaProxy` to start Vite and redirect the browser to it
- Vite proxies `/api`, `/login`, `/signin-oidc`, and `/health` back to ASP.NET Core

This keeps frontend HMR fast while preserving the backend's auth and API pipeline. In production, the backend serves pre-built static files from `wwwroot/`.

### Backend Development

The backend is configured with hot reload via `dotnet watch`. Any changes to C# files automatically restart the server. Visual Studio users can also run the `server` project directly with `SpaProxy`.

### Frontend Development

The frontend uses Vite's hot module replacement (HMR). Changes to React components, TypeScript files, and CSS are reflected immediately by the Vite dev server.

### Authentication Flow

1. Frontend routes requiring authentication redirect to the backend's login endpoint
2. Backend handles OIDC flow with Microsoft Entra ID
3. Upon successful authentication, a same-site cookie is set
4. Frontend API calls automatically include the authentication cookie
5. Backend validates the cookie for protected endpoints

## Testing

### Client tests

- Run `cd client && npm test` to execute the Vitest suite once.
- Use `npm run test:watch` inside `client/` for red/green feedback while you work.
- Tests run against a jsdom environment with Testing Library so you do not need the backend running.

### Server tests

- Run `dotnet test` from the repository root to execute the .NET test project included in `app.sln`.
- Alternatively, target the project directly with `dotnet test tests/server.tests/server.tests.csproj`.
- The tests use EF Core's in-memory provider (see `tests/server.tests/TestDbContextFactory.cs`) so no SQL Server instance is required.

## Updating Dependencies

### Client

- JavaScript/TypeScript packages: run `npm outdated` at the repository root and inside `client/` to see what can be updated. Use `npm update` in each location for compatible updates, or `npm install <package>@latest` when you need to jump to a new major version.
- After updating Node packages, reinstall if needed (`npm install`, `cd client && npm install`) and rerun key checks like `npm run lint`, `cd client && npm test`, and `dotnet test`.

### Server

.Net is a bit more complicated, but we're going to use the dotnet-outdated tool to help.

Run the following command from the repository root:

```
dotnet-outdated
```

and it'll show you a nice table of what can be updated. Be careful when updating major versions, especially with packages that are pinned to the .net version.

You can update individual packages or you can use the `--upgrade` flag to update all at once. Here's a nice way to do it and only update minor/patch versions:

```
dotnet-outdated --upgrade --version-lock Major
```

If you update `Microsoft.EntityFrameworkCore.Design` or another package that a tool depends on, you'll want to update that tool as well to match, ex: `dotnet tool update dotnet-ef --local --version 8.0.21`. That will update it for you but also set the value in our `dotnet-tools.json` so it's consistent for everyone.

And as always, after updating dependencies, make sure to run `dotnet build` and `dotnet test` to verify everything is working.

## Project Structure

```text
.
├── client/                  # React frontend
│   ├── src/
│   │   ├── routes/          # TanStack Router routes
│   │   ├── queries/         # TanStack Query hooks
│   │   ├── lib/             # API client and utilities
│   │   └── shared/          # Shared components
│   ├── package.json
│   └── vite.config.ts
├── server/                  # .NET backend
│   ├── Controllers/         # API controllers
│   ├── Helpers/             # Utility classes
│   ├── Properties/          # Launch settings
│   ├── Program.cs           # Application entry point
│   └── server.csproj        # SpaProxy + publish integration
├── package.json             # Root dev orchestration scripts
└── app.sln                  # Visual Studio solution file
```

## Available Scripts

### Root Level

- `npm start` - Starts both backend and frontend with hot reload
- `npm run start:server` - Starts only the ASP.NET Core backend
- `npm run start:client` - Starts only the Vite dev server

### Client Directory

- `npm run dev` - Start Vite development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build
- `npm test` - Run tests

### Server Directory

- `dotnet run` - Start the .NET application
- `dotnet watch` - Start with hot reload
- `dotnet build` - Build the application
- `dotnet test` - Run tests
