# New Project Customization Guide

Use this checklist right after cloning the template to ensure every new project starts with the correct identity, infrastructure settings, and clean source. Each section calls out the files to touch and optional tweaks to consider.

## 1. Project Identity & Metadata (optional)

- Rename the repository, solution, and npm package names so deployment artifacts read correctly:
  - Update `name` in `package.json` (root) and `client/package.json`.
  - If you rename the solution or projects, update `app.sln`, `server/server.csproj`, `server.core/server.core.csproj`, and any CI references.

## 2. Dev Ports & SPA Proxy Wiring (optional)

If you need the app to run on ports other than the default `5165` (API) and `5173` (Vite), change the values in all four places so hot reload keeps working:

1. `server/Properties/launchSettings.json` → update `profiles.http.applicationUrl` (and IIS Express URL if you use it).
2. `server/server.csproj` → adjust `<SpaProxyServerUrl>` so the .NET SPA proxy opens the correct Vite address.
3. `client/vite.config.ts` → change `server.port` and update every proxy target pointing at `http://localhost:5165`.
4. `.devcontainer/devcontainer.json` → update `containerEnv.ASPNETCORE_URLS`, `forwardPorts`, and `portsAttributes` so port auto-forwarding stays in sync.

## 3. Microsoft Entra ID (Azure AD) App Sign-In Setup

This section configures the Entra app registration that users sign in to through Microsoft Identity Web. It is separate from the GitHub deployment identity created later by `infrastructure/azure/github-oidc.bicep`.

1. Visit https://entra.microsoft.com → **App registrations** → **New registration**.
2. Give the app a friendly name, pick the correct supported account types, and add the following redirect URIs. Use HTTPS in production and match whatever port you configured above:
   - `http://localhost:5173/signin-oidc` for the default Vite development flow
   - `http://localhost:5165/signin-oidc` if you also test directly against the backend origin
   - `https://localhost:44322/signin-oidc` if you use the default IIS Express profile
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

The Azure deployment bootstrap in section 5 automates a different Entra application/service principal for GitHub Actions OIDC. Do not use that bootstrap `clientId` as `Auth:ClientId` unless you intentionally combined the deployment identity and the user sign-in app registration, which is not the default setup.

## 4. Secrets, Connection Strings, & Environment Files

- Connection strings: overwrite `ConnectionStrings:DefaultConnection` in `server/appsettings.Development.json` or, preferably, set `DB_CONNECTION` in `server/.env` / `server/.env.Development`. `Program.cs` reads `DB_CONNECTION` first, then falls back to the JSON file.
- Telemetry settings: use the example values in `server/.env.example` and provide real endpoints/keys in your `.env` files:
  - `OTEL_EXPORTER_OTLP_ENDPOINT`
  - `OTEL_EXPORTER_OTLP_HEADERS` (e.g., `Authorization=Bearer <token>`)
  - `OTEL_SERVICE_NAME`
  - `OTEL_RESOURCE_ATTRIBUTES` (e.g., `deployment.environment=Development,service.namespace=<app-name>`)
- Commit only the `.env.example` scaffolding—never real credentials—and document which secrets are required for each environment.

## 5. Azure Deployment Setup

Replace all placeholder deployment names before the first cloud deployment. The defaults are intentionally generic:

- `APP_NAME=webapp`
- `RESOURCE_GROUP=rg-webapp-test` for `test`
- `RESOURCE_GROUP=rg-webapp-prod` for `prod`

The Azure deployment templates only allow `test` and `prod`. Resource groups must end with the matching environment suffix, and deployments must pass the expected subscription ID guard before resources are created.

### GitHub Environments

Create GitHub Environments named `test` and `prod`. Configure production reviewers or approval gates as appropriate for your project.

Using GitHub CLI:

```bash
gh api --method PUT repos/<owner>/<repo>/environments/test
gh api --method PUT repos/<owner>/<repo>/environments/prod
```

You need repository admin permission, and your `gh` token must be able to manage repository environments, variables, and secrets. If `gh variable set --env test ...` returns `HTTP 404: Not Found`, confirm the environment exists and that `gh repo view` points at the expected repository.

Each environment needs these variables from the OIDC bootstrap output or your Azure subscription:

- `AZURE_CLIENT_ID`: bootstrap `clientId` output
- `AZURE_TENANT_ID`: bootstrap `tenantId` output
- `AZURE_SUBSCRIPTION_ID`: bootstrap `subscriptionId` output
- `RESOURCE_GROUP`: bootstrap `resourceGroupName` output

When the workflow should create or update Azure SQL and App Service resources, add this secret:

- `SQL_ADMIN_PASSWORD`

Optional GitHub Environment variables/secrets used by the reusable deployment workflow include:

- App identity and location: `APP_NAME`, `AZURE_LOCATION`
- Existing infrastructure deploys: `WEB_APP_NAME`, `DB_CONNECTION` secret
- Auth: `AUTH_CLIENT_ID`, `AUTH_TENANT_ID`, `AUTH_DOMAIN`, `AUTH_INSTANCE`, `AUTH_CALLBACK_PATH`
- Notifications and SMTP: `NOTIFICATION_BASE_URL`, `NOTIFICATION_DEFAULT_APP_NAME`, `NOTIFICATION_DEFAULT_BUTTON_TEXT`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_TIMEOUT`, `SMTP_USE_SSL`, `SMTP_USERNAME`, `SMTP_PASSWORD` secret, `SMTP_FROM_EMAIL`, `SMTP_FROM_NAME`, `SMTP_REPLY_TO_EMAIL`, `SMTP_BCC_EMAIL`
- Observability: `OTLP_EXPORTER_ENDPOINT`, `OTLP_EXPORTER_PROTOCOL`, `OTEL_EXPORTER_OTLP_HEADERS` secret, `OTEL_SERVICE_NAME`, `OTEL_RESOURCE_ATTRIBUTES`
- SKUs and database names: `WEB_SKU_NAME`, `WEB_SKU_TIER`, `SQL_DATABASE_NAME`, `SQL_SKU_NAME`, `SQL_SKU_TIER`, `SQL_ADMIN_LOGIN`

### One-time OIDC bootstrap

Run `infrastructure/azure/github-oidc.bicep` once per environment before the first GitHub deployment. Run it again after repository, organization, GitHub Environment, resource group, subscription, or identity changes, or if the generated Entra app/service principal is deleted.

Why OIDC is used: GitHub Actions receives short-lived Azure tokens scoped to this repository and GitHub Environment. That removes the need to store long-lived Azure client secrets in GitHub.

This bootstrap is only for deployment authentication from GitHub Actions to Azure. It does not create or configure the Microsoft Identity Web app registration used for end-user sign-in in section 3.

Example for `test`:

```bash
az login
az account set --subscription "<subscription-id>"
deployment_name="github-oidc-<app-name>"
az deployment sub create \
  --name "$deployment_name" \
  --location westus2 \
  --template-file infrastructure/azure/github-oidc.bicep \
  --parameters \
    appName="<app-name>" \
    repository="<owner>/<repo>" \
    env="test" \
    expectedSubscriptionId="<subscription-id>" \
    resourceGroupName="rg-<app-name>-test"
```

For example, with the default `APP_NAME=webapp`, use `deployment_name="github-oidc-webapp"`. Repeat with `env="prod"`, a production deployment name such as `deployment_name="github-oidc-<app-name>-prod"`, and a `-prod` resource group for production. The bootstrap output should include `deploymentGuardPassed=true`, `clientId`, `tenantId`, `subscriptionId`, `principalId`, `resourceGroupName`, and `federatedCredentialSubject`.

If you did not set `--name`, Azure CLI usually names the deployment after the template file, for example `github-oidc`. Find recent subscription deployments with:

```bash
az deployment sub list \
  --query "sort_by([].{name:name,timestamp:properties.timestamp,provisioningState:properties.provisioningState}, &timestamp)[-5:]" \
  --output table
```

Get the GitHub Environment variable values from the deployment outputs:

```bash
az deployment sub show \
  --name "$deployment_name" \
  --query "properties.outputs.{AZURE_CLIENT_ID:clientId.value,AZURE_TENANT_ID:tenantId.value,AZURE_SUBSCRIPTION_ID:subscriptionId.value,RESOURCE_GROUP:resourceGroupName.value,federatedCredentialSubject:federatedCredentialSubject.value}" \
  --output table
```

Configure the GitHub Environment with those values:

```bash
gh variable set AZURE_CLIENT_ID --env test --body "$(az deployment sub show --name "$deployment_name" --query properties.outputs.clientId.value --output tsv)"
gh variable set AZURE_TENANT_ID --env test --body "$(az deployment sub show --name "$deployment_name" --query properties.outputs.tenantId.value --output tsv)"
gh variable set AZURE_SUBSCRIPTION_ID --env test --body "$(az deployment sub show --name "$deployment_name" --query properties.outputs.subscriptionId.value --output tsv)"
gh variable set RESOURCE_GROUP --env test --body "$(az deployment sub show --name "$deployment_name" --query properties.outputs.resourceGroupName.value --output tsv)"
```

Then add the SQL admin password as a GitHub Environment secret:

```bash
gh secret set SQL_ADMIN_PASSWORD --env test
```

The operator needs permission to create Entra applications/service principals. With the default `assignRbac=true`, the operator also needs Owner or User Access Administrator at the target resource group scope. If they do not have that permission, run with `assignRbac=false`, then have an Azure owner assign Contributor to the emitted `principalId` on the target resource group.

The first Bicep build or deployment may restore the Microsoft Graph extension configured in `infrastructure/azure/bicepconfig.json`.

### First deployment

The `CI/CD` workflow:

- Validates pull requests.
- Deploys pushes to `main` to the `test` environment.
- Supports manual deployments to `test` or `prod`, including a `deploy_infra` toggle.

For local deployment:

```bash
export APP_NAME="<app-name>"
export AZURE_SUBSCRIPTION_ID="<subscription-id>"
export SQL_ADMIN_PASSWORD="<strong-password>"
infrastructure/azure/deploy_test.sh
```

Use `infrastructure/azure/deploy_prod.sh` for production. For existing Azure infrastructure, run:

```bash
DEPLOY_INFRA=false WEB_APP_NAME="<app-service-name>" infrastructure/azure/deploy.sh test
```

After App Service has a stable hostname or custom domain, add these redirect URIs to your app registration:

- `https://<app-service-hostname>/signin-oidc`
- `https://<custom-domain>/signin-oidc`, if you use a custom domain

Portal flow:

1. Go to https://entra.microsoft.com → **Applications** → **App registrations**.
2. Open the application used for user sign-in, matching `AUTH_CLIENT_ID` / `Auth:ClientId`.
3. Open **Authentication**.
4. Under **Web** → **Redirect URIs**, add the App Service callback URI, for example `https://<app-service-hostname>/signin-oidc`.
5. Save the app registration, then retry sign-in.

Azure CLI flow:

```bash
auth_client_id="<auth-client-id>"
redirect_uri="https://<app-service-hostname>/signin-oidc"

redirect_uris=()
while IFS= read -r existing_uri; do
  redirect_uris+=("$existing_uri")
done < <(az ad app show --id "$auth_client_id" --query "web.redirectUris[]" --output tsv)

if [[ ! " ${redirect_uris[*]} " =~ " ${redirect_uri} " ]]; then
  redirect_uris+=("$redirect_uri")
fi

az ad app update \
  --id "$auth_client_id" \
  --web-redirect-uris "${redirect_uris[@]}"
```

For this template deployment, the command is:

```bash
auth_client_id="<auth-client-id>"
redirect_uri="https://<app-service-hostname>/signin-oidc"

redirect_uris=()
while IFS= read -r existing_uri; do
  redirect_uris+=("$existing_uri")
done < <(az ad app show --id "$auth_client_id" --query "web.redirectUris[]" --output tsv)

if [[ ! " ${redirect_uris[*]} " =~ " ${redirect_uri} " ]]; then
  redirect_uris+=("$redirect_uri")
fi

az ad app update \
  --id "$auth_client_id" \
  --web-redirect-uris "${redirect_uris[@]}"
```

The app currently applies existing EF Core migrations at startup. The deployment scaffold must not create or edit migrations, but first cloud deployment will apply whatever migrations already exist unless you change startup behavior.

The app currently stores ASP.NET Core data-protection keys on the local filesystem. This is fine for typical single-instance App Service deployments. Configure shared key storage before scaling out to multiple instances or using slots that must share auth cookies.

## 6. Telemetry & Logging Adjustments

`server/Helpers/TelemetryHelper.cs` wires OpenTelemetry for logs, traces, and metrics. Tweak as needed:

- Update the sampler rate (`TraceIdRatioBasedSampler(0.2)`) for production.
- Validate that your OTLP endpoint accepts the JSON console logs or add `logging.AddConsole()` if you also want plain text locally.

Confirm your observability backend (Grafana, New Relic, Azure Monitor) receives traffic by temporarily setting `OTEL_LOG_LEVEL=debug` and checking the startup output.

## 7. Email Notification

The template includes a reusable email notification stack in `server.core`:

- Shared services live in `server.core/Notification/`.
- Razor + MJML templates live in `server.core/Views/Emails/` and `server.core/Views/Shared/`.
- The notification UI lives at `client/src/routes/(authenticated)/notification.tsx`.
- The default notification trigger lives at `POST /api/notification/default` and is development-only.

For local development, point the `Smtp` settings in `server/.env.Development` or `server/appsettings.Development.json` at your Mailtrap SMTP inbox. At minimum, review:

- `Smtp__Host`
- `Smtp__Port`
- `Smtp__UseSsl`
- `Smtp__Username`
- `Smtp__Password`
- `Smtp__FromEmail`
- `Smtp__FromName`
- `Notification__BaseUrl`

Optional SMTP and notification settings you may also want to customize:

- `Smtp__Timeout`
- `Smtp__ReplyToEmail`
- `Smtp__BccEmail`
- `Notification__DefaultAppName`
- `Notification__DefaultButtonText`

When you start replacing the default notification flow with real notification use cases, keep app-specific composition in your own core services. Follow `NotificationService` as the pattern for rendering templates with `INotificationRenderer`, then hand the final text/html message to `IEmailService` for delivery.

## 8. Clean Up Sample Code

Remove or rewrite sample artifacts so they do not ship:

- **Backend**
  - Delete `server/Controllers/WeatherForecastController.cs` and associated domain types/seeds in `server.core/Domain/Weather.cs`, `server.core/Data/AppDbContext.cs`, and `server.core/Data/DbInitializer.cs`.
  - Replace the sample EF Core migrations in `server.core/Migrations/` with migrations for your own schema (`dotnet ef migrations add InitialCreate -p server.core -s server`).
  - Review `UserController` and shape the `/api/user/me` payload/claims to match your app.
- **Frontend**
  - Remove the showcase routes in `client/src/routes/(authenticated)/*`, `client/src/routes/about.tsx`, and related components in `client/src/shared/` once you no longer need them.
  - Regenerate the router tree (`client/src/routeTree.gen.ts`) by re-running `cd client && npm run dev` after deleting or adding routes.
  - Update or drop showcase-specific queries (`client/src/queries/*`) so TanStack Query only exposes real endpoints.

Discard unused assets, tests, and mock data that referenced the template demos.

## 9. Polish the UX & Tooling

- Turn off dev-only tooling—`ReactQueryDevtools` and `TanStackRouterDevtools` in `client/src/routes/__root.tsx`—for production builds or gate them behind `import.meta.env.DEV`.
- Update Swagger metadata (title, description, contact) inside `Program.cs` when calling `builder.Services.AddSwaggerGen(...)` or remove entirely.
- Review `.devcontainer/devcontainer.json`, `.github/workflows/`, and `infrastructure/azure/` to ensure they use your new names, ports, environments, and variables.
- Re-run `npm install`, `cd client && npm install`, and `dotnet restore` after updating Node/.NET versions (`global.json`) so everyone builds with the intended SDKs.

## 10. Final Verification Checklist

- [ ] `npm start` launches both servers on the expected ports.
- [ ] `dotnet test` and `cd client && npm test` succeed.
- [ ] `az bicep build --file infrastructure/azure/main.bicep` succeeds.
- [ ] `az bicep build --file infrastructure/azure/github-oidc.bicep` succeeds.
- [ ] GitHub Environment variables/secrets are configured from the OIDC bootstrap outputs.
- [ ] Logging and OTLP exports reach your observability backend.
- [ ] Signing in via Microsoft Entra succeeds locally (and in cloud environments, once deployed).
- [ ] README and onboarding docs describe your product, not the template.

Once everything above is done, commit the cleaned template as the first commit of your new application so future diffs show only your changes.
