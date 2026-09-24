# Web App Template

A full-stack web application template featuring a .NET 10 backend with React/Vite frontend, using OIDC authentication with Microsoft Entra ID by default.

## Architecture

- **Backend**: .NET 10 Web API with ASP.NET Core
- **Frontend**: React 19 with Vite, TypeScript, and TanStack Router/Query/Table
- **Authentication**: See [Auth Configuration](#auth-configuration) for the default Entra flow and optional local sign-in
- **Styling**: Tailwind CSS
- **Development**: Hot reload for both frontend and backend
- **Development Integration**: ASP.NET Core `SpaProxy` launches Vite for Visual Studio users, while Vite proxies API and auth routes back to ASP.NET Core during development

## Run the Docker sandbox

With Docker and Compose installed, choose a unique project name for this checkout or worktree, then run these commands from its root:

```bash
export SANDBOX_PROJECT=template-feature-a
export SANDBOX_PORT=5280
export SANDBOX_MAIL_PORT=8025
docker compose -p "$SANDBOX_PROJECT" -f .devcontainer/docker-compose.sandbox.yml up --build --wait
```

Use a distinct `SANDBOX_PROJECT` for every checkout and different app and inbox ports for sandboxes running concurrently. Keep these same values for every command that manages this sandbox, including in a new terminal. Compose rejects an unset or empty `SANDBOX_PROJECT`. See [multiple sandboxes](docs/SANDBOX.md#ports-and-multiple-sandboxes) for a second worktree example.

Open [the sandbox](http://localhost:5280) and choose **Sign in as Sample User**. The image builds the current checkout's React app and .NET server. SQL Server starts first, then the app applies migrations and seeds ten weather records dated January 1–10, 2025. No host Node, .NET, `.env`, Entra registration, or SMTP account is needed. The first build needs internet access to download images and dependencies.

The [local inbox](http://localhost:8025) captures mail from the Notification page. Use **Basic User** at [local sign-in](http://localhost:5280/login) to test the weather API's `403` response, or sign out there. These fictional users have fixed identities and claims; the template does not have a user table.

Restarting preserves database changes. To return to the original fixtures, remove this sandbox's containers and volumes, then start it again:

```bash
docker compose -p "$SANDBOX_PROJECT" -f .devcontainer/docker-compose.sandbox.yml down --volumes
docker compose -p "$SANDBOX_PROJECT" -f .devcontainer/docker-compose.sandbox.yml up --build --wait
```

This deletes the sandbox database and local sign-in keys. It does not affect the regular development database. Rebuild with `up --build --wait` after editing source. See [the sandbox guide](docs/SANDBOX.md) for ports, logs, and agent use.

## Set up for development

1. **Clone the repository**

   ```bash
   git clone https://github.com/ucdavis/web-app-template/
   cd web-app-template
   ```

2. **Configure authentication before starting**

   Copy the local configuration example:

   ```bash
   cp server/.env.example server/.env
   ```

   Choose an authentication mode under [Auth Configuration](#auth-configuration) and configure it in `server/.env` before starting the backend. This step also applies before opening the DevContainer.

   SMTP and external telemetry are optional. Leave their example settings disabled until you configure those services.

3. **Open In DevContainer**

   - Open the project folder in Visual Studio Code.
   - Click the prompt to open in container (or manually select from the command palette).

_Using the DevContainer is optional, but it will get you the right version of dotnet + node, plus install all dependencies and setup a local SQL instance for you_

4. **Start the application**

   **Inside DevContainer**: After the authentication configuration above, `postStartCommand` starts the application automatically.

   **Outside DevContainer (command line)**:

   Prerequisites:
   - [.NET 10 SDK](https://dotnet.microsoft.com/download)
   - [Node.js 22.18+](https://nodejs.org/) (includes npm)
   - Docker (for the local SQL Server container)

   With nvm, run `nvm install` and `nvm use` from the repo root to use the supported Node 22 line.

   Install dependencies and start the app:
   ```bash
   npm ci
   cd client && npm ci && cd ..
   dotnet tool restore
   npm run db:up
   npm start
   ```

   `npm run db:up` starts the SQL Server container from the same Compose file used by the DevContainer. `npm start` starts the .NET backend on port `5165` with a CLI-specific launch profile, waits for health check, and then starts the Vite dev server on port `5173` which opens the browser.

   **Visual Studio (Windows)**:

   Prerequisites:
   - Visual Studio 2026 version 18.0 or later (for `net10.0` support)
   - [Node.js 22.18+](https://nodejs.org/) (includes npm)
   - Docker (for the local SQL Server container)

   Install dependencies and start the database:
   ```bash
   npm ci
   cd client && npm ci && cd ..
   dotnet tool restore
   npm run db:up
   ```

   Then open `app.sln`, set the `server` project as the startup project, and press `F5`. `SpaProxy` starts Vite if needed and redirects the browser to the frontend dev server.

   **Visual Studio Code**:

   Prerequisites:
   - [.NET 10 SDK](https://dotnet.microsoft.com/download)
   - [Node.js 22.18+](https://nodejs.org/) (includes npm)
   - Docker (for the local SQL Server container)

   Install dependencies and start the database:
   ```bash
   npm ci
   cd client && npm ci && cd ..
   dotnet tool restore
   npm run db:up
   ```

   Then open the repo root in VS Code, install the recommended extensions when prompted (at minimum the Microsoft C# extension), choose `Full Stack: VS Code` in **Run and Debug**, and press `F5`. VS Code builds and launches the backend with the `http-cli` launch profile, starts Vite after the backend health check passes, and opens the app in your default external browser at `http://localhost:5173`. For backend-only debugging, choose `Backend: ASP.NET Core + Swagger`.

5. **Access the application**

In development, the frontend runs from **http://localhost:5173** and proxies backend requests to ASP.NET Core on **http://localhost:5165**.

- **Main App**: http://localhost:5173
- **Backend API**: http://localhost:5165/api/*
- **API Documentation (Swagger)**: http://localhost:5165/swagger
- **Health Check**: http://localhost:5165/health
- **Visual Studio F5**: launches through the backend profile, then redirects to the Vite dev server on `:5173`

### Database configuration

The backend requires a SQL Server connection string.

Startup always applies migrations. Sample weather data is inserted only when `DevelopmentData__SeedOnStartup=true`, and only if the weather table is empty. The Docker sandbox sets this flag. For ordinary development, opt in through `server/.env` when you want the sample records.

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

By default, the app uses OIDC with Microsoft Entra ID (Azure AD). In this mode, set `Auth__ClientId` in `server/.env` to your app registration's client ID before starting the backend. Startup rejects the template's placeholder so copied projects cannot accidentally authenticate as the template app.

The Docker sandbox enables fictional local users with `Auth__UseLocal=true`, bypassing Entra configuration. To use these users in ordinary development, set the same flag in `server/.env`. The flag defaults to false, and startup rejects it outside the `Development` environment.

For a new application registration, redirect URIs, and app-specific auth settings, follow [the customization guide](README.customization.md#3-microsoft-entra-id-azure-ad-app-sign-in-setup).

To include the `ucdPersonIAMID` claim shown on the main page, follow [Authentication](https://app.notion.com/p/caes-cru/Authentication-2eae70f674118020ba74e953828d2591?source=copy_link).

### Google Analytics (GA4)

This template includes GA4 wiring:

- GA bootstrap script is in `client/index.html`
- Route-change page view tracking is in `client/src/shared/analytics/AnalyticsListener.tsx`

A placeholder measurement ID is included by default:

- `G-XXXXXXXXXX`

Before using this template in a real app, replace `G-XXXXXXXXXX` in `client/index.html` with your real GA4 measurement ID in **both** places:

1. `https://www.googletagmanager.com/gtag/js?id=...`
2. `gtag('config', '...')`

### Health check

The health check endpoint (`/health`) is configured to return the status of the application and its dependencies. It includes a database health check to ensure the SQL Server connection is healthy. See [Health Checks](https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/health-checks?view=aspnetcore-10.0#entity-framework-core-dbcontext-probe).

## Azure Deployment

GitHub Actions is the primary deployment path. Start with the [Azure deployment guide](infrastructure/azure/README.md); it links to the detailed bootstrap instructions and describes the production SQL networking prerequisite.

Cloud deployments are intentionally limited to `test` and `prod`. Before the first cloud deployment, replace placeholder names such as `webapp`, `rg-webapp-test`, and `rg-webapp-prod` with names for your application.

For GitHub Environments, the one-time OIDC bootstrap, deployment settings sync, local deploy scripts, and first-deploy caveats, see [Azure Deployment Setup](README.customization.md#5-azure-deployment-setup). For the hosting flow and key deployment files, see [Development Architecture](docs/ARCHITECTURE.md#azure-hosting-flow).

## Development

### Development Architecture

In development, ASP.NET Core runs on port `5165`, Vite serves the frontend on port `5173`, and Vite proxies backend routes to ASP.NET Core. Visual Studio uses `SpaProxy` to start Vite and redirect the browser to it.

For request-flow diagrams, production behavior, and key file responsibilities, see [Development Architecture](docs/ARCHITECTURE.md).

### Backend Development

The backend is configured with hot reload via `dotnet watch`. Any changes to C# files automatically restart the server. Visual Studio users can also run the `server` project directly with `SpaProxy`.

### Frontend Development

The frontend uses Vite's hot module replacement (HMR). Changes to React components, TypeScript files, and CSS are reflected immediately by the Vite dev server.

### VS Code Debugging

The repository includes `.vscode/launch.json` and `.vscode/tasks.json` so the standard VS Code workflow works out of the box:

- `Full Stack: VS Code` launches the backend debugger, starts the Vite dev server, and opens the frontend in your default external browser.
- `Backend: ASP.NET Core + Swagger` launches only the backend and opens Swagger when Kestrel is ready.

The VS Code flow intentionally uses the `http-cli` launch profile instead of the `SpaProxy` profile so terminal and editor-driven debugging both avoid the duplicate browser-launch behavior from the ASP.NET Core side.

### Authentication Flow

1. Frontend routes requiring authentication redirect to the backend's login endpoint
2. Backend uses the mode described under [Auth Configuration](#auth-configuration)
3. Upon successful authentication, a same-site cookie is set
4. Frontend API calls automatically include the authentication cookie
5. Backend validates the cookie for protected endpoints

After sign-in, `/login?returnUrl=...` accepts only local paths such as `/fetch?sort=date`. Missing or external destinations fall back to `/`.

## Testing

### Client tests

- Run `cd client && npm test -- --run` to execute the Vitest suite once.
- Use `npm run test:watch` inside `client/` for red/green feedback while you work.
- Tests run against a jsdom environment with Testing Library so you do not need the backend running.

### Server tests

- Run `dotnet test` from the repository root to execute the .NET test project included in `app.sln`.
- Alternatively, target the project directly with `dotnet test tests/server.tests/server.tests.csproj`.
- The tests use EF Core's in-memory provider (see `tests/server.tests/TestDbContextFactory.cs`) so no SQL Server instance is required.

## Updating Dependencies

### Client

- JavaScript/TypeScript packages: run `npm outdated` at the repository root and inside `client/` to see what can be updated. Use `npm update` in each location for compatible updates, or `npm install <package>@latest` when you need to jump to a new major version.
- After updating Node packages, reinstall if needed (`npm install`, `cd client && npm install`) and rerun key checks like `cd client && npm run lint`, `cd client && npm test`, and `dotnet test`.

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

If you update `Microsoft.EntityFrameworkCore.Design` or another package that a tool depends on, you'll want to update that tool as well to match, ex: `dotnet tool update dotnet-ef --local --version 10.0.1`. That will update it for you but also set the value in our `dotnet-tools.json` so it's consistent for everyone.

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
├── infrastructure/azure/    # Azure Bicep templates and local deployment scripts
├── .github/workflows/       # CI/CD and reusable Azure App Service deployment workflow
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
- `npm run dev:open` - Start Vite development server and open the browser
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build
- `npm test` - Run tests

### Server Directory

- `dotnet run` - Start the .NET application
- `dotnet watch` - Start with hot reload
- `dotnet build` - Build the application
- `dotnet test` - Run tests
