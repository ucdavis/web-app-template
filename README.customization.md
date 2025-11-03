# New Project Customization Guide

Use this checklist right after cloning the template to ensure every new project starts with the correct identity, infrastructure settings, and clean source. Each section calls out the files to touch and optional tweaks to consider.

## 1. Project Identity & Metadata (optional)

- Rename the repository, solution, and npm package names so deployment artifacts read correctly:
  - Update `name` in `package.json` (root) and `client/package.json`.
  - If you rename the solution or projects, update `app.sln`, `server/server.csproj`, `server.core/server.core.csproj`, and any CI references.

## 2. Dev Ports & SPA Proxy Wiring (optional)

If you need the app to run on ports other than the default `5165` (API) and `5173` (Vite), change the values in all three places so hot reload keeps working:

1. `server/Properties/launchSettings.json` → update `profiles.http.applicationUrl` (and IIS Express URL if you use it).
2. `server/server.csproj` → adjust `<SpaProxyServerUrl>` so the .NET SPA proxy opens the correct Vite address.
3. `client/vite.config.ts` → change `server.port` and update every proxy target pointing at `http://localhost:5165`.

## 3. Microsoft Entra ID (Azure AD) Setup

1. Visit https://entra.microsoft.com → **App registrations** → **New registration**.
2. Give the app a friendly name, pick the correct supported account types, and add the following redirect URIs. Use HTTPS in production and match whatever port you configured above:
   - `http://localhost:5165/signin-oidc` (or your new callback path)
   - Any additional public endpoints your hosting environment will expose.
3. Under **Authentication**, enable ID tokens and add logout URLs if needed.
4. Copy the **Directory (tenant) ID**, **Application (client) ID**, and your verified domain. At UCD tenant is always the same.

Then update `server/appsettings.json`:

```jsonc
"Auth": {
  "Instance": "https://login.microsoftonline.com/",
  "Domain": "<your-domain>",
  "TenantId": "<tenant-guid>",
  "ClientId": "<client-guid>",
  "CallbackPath": "/signin-oidc"
}
```

If you change `CallbackPath`, remember to mirror it in the Entra redirect URIs.

## 4. Secrets, Connection Strings, & Environment Files

- Connection strings: overwrite `ConnectionStrings:DefaultConnection` in `server/appsettings.Development.json` or, preferably, set `DB_CONNECTION` in `server/.env` / `server/.env.Development`. `Program.cs` reads `DB_CONNECTION` first, then falls back to the JSON file.
- Telemetry settings: use the example values in `server/.env.example` and provide real endpoints/keys in your `.env` files:
  - `OTEL_EXPORTER_OTLP_ENDPOINT`
  - `OTEL_EXPORTER_OTLP_HEADERS` (e.g., `Authorization=Bearer <token>`)
  - `OTEL_SERVICE_NAME`
- Commit only the `.env.example` scaffolding—never real credentials—and document which secrets are required for each environment.

## 5. Telemetry & Logging Adjustments

`server/Helpers/TelemetryHelper.cs` wires OpenTelemetry for logs, traces, and metrics. Tweak as needed:

- Update the sampler rate (`TraceIdRatioBasedSampler(0.2)`) for production.
- Validate that your OTLP endpoint accepts the JSON console logs or add `logging.AddConsole()` if you also want plain text locally.

Confirm your observability backend (Grafana, New Relic, Azure Monitor) receives traffic by temporarily setting `OTEL_LOG_LEVEL=debug` and checking the startup output.

## 6. Clean Up Sample Code

Remove or rewrite sample artifacts so they do not ship:

- **Backend**
  - Delete `server/Controllers/WeatherForecastController.cs` and associated domain types/seeds in `server.core/Domain/Weather.cs`, `server.core/Data/AppDbContext.cs`, and `server.core/Data/DbInitializer.cs`.
  - Replace the sample EF Core migrations in `server.core/Migrations/` with migrations for your own schema (`dotnet ef migrations add InitialCreate -p server.core -s server`).
  - Review `UserController` and shape the `/api/user/me` payload/claims to match your app.
- **Frontend**
  - Remove the showcase routes in `client/src/routes/(authenticated)/*`, `client/src/routes/about.tsx`, and related components in `client/src/shared/` once you no longer need them.
  - Regenerate the router tree (`client/src/routeTree.gen.ts`) by re-running `npm run dev` after deleting/adding routes.
  - Update or drop showcase-specific queries (`client/src/queries/*`) so TanStack Query only exposes real endpoints.

Discard unused assets, tests, and mock data that referenced the template demos.

## 7. Polish the UX & Tooling

- Turn off dev-only tooling—`ReactQueryDevtools` and `TanStackRouterDevtools` in `client/src/routes/__root.tsx`—for production builds or gate them behind `import.meta.env.DEV`.
- Update Swagger metadata (title, description, contact) inside `Program.cs` when calling `builder.Services.AddSwaggerGen(...)` or remove entirely.
- Review `.devcontainer/devcontainer.json`, CI workflows, and deployment manifests (if you add them) to ensure they use your new names, ports, and environment variables.
- Re-run `npm install`, `cd client && npm install`, and `dotnet restore` after updating Node/.NET versions (`global.json`) so everyone builds with the intended SDKs.

## 8. Final Verification Checklist

- [ ] `npm start` launches both servers on the expected ports.
- [ ] `dotnet test` and `cd client && npm test` succeed.
- [ ] Logging and OTLP exports reach your observability backend.
- [ ] Signing in via Microsoft Entra succeeds locally (and in cloud environments, once deployed).
- [ ] README and onboarding docs describe your product, not the template.

Once everything above is done, commit the cleaned template as the first commit of your new application so future diffs show only your changes.
