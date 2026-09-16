# Docker sandbox

The sandbox packages the current checkout into an image and runs it with SQL Server and Mailpit. ASP.NET Core serves the compiled React frontend, API, and local login on one origin. It uses the same EF migrations, controllers, role checks, and notification renderer as the regular app.

## Start and inspect

Run commands from the repository root. This Compose file is standalone, unlike the Leaves override that inspired it.

```bash
docker compose -f .devcontainer/docker-compose.sandbox.yml up --build --wait
docker compose -f .devcontainer/docker-compose.sandbox.yml ps
docker compose -f .devcontainer/docker-compose.sandbox.yml logs --tail=100 app
```

Open <http://localhost:5280>. Choose Sample User to access the examples. The app health check at `/health` verifies SQL connectivity after migrations and seeding finish. Compose waits for SQL and Mailpit health before starting the app.

Try these flows:

1. Sign in as Sample User, open Fetch, and page through the ten fixed weather records.
2. Open Table Export and download the example CSV. Open Form to try validation.
3. Open Notification and send either example. Read the rendered email at <http://localhost:8025>. Mailpit captures all recipients locally and has no relay configured.
4. Visit `/login`, switch to Basic User, and request `/api/weatherforecast`. It returns `403` because this user lacks `SampleRole`. `/api/user/me` still returns their identity.
5. Visit `/login` and sign out. `/api/user/me` returns `401`. The public `/about` page still opens.

Sample User has ID `sandbox-sample`, email `sample@example.test`, IAM ID `sandbox-10001`, and roles `User` and `SampleRole`. Basic User has ID `sandbox-basic`, email `basic@example.test`, IAM ID `sandbox-10002`, and only `User`. They are fixed claims, not database user rows. Extend `LocalAuthentication.cs` when adding application roles, and `DbInitializer.cs` when adding fixtures.

## Stop, rebuild, and reset

```bash
# Stop and preserve the database and cookie keys.
docker compose -f .devcontainer/docker-compose.sandbox.yml down

# Build the current source and start again.
docker compose -f .devcontainer/docker-compose.sandbox.yml up --build --wait

# Delete only this sandbox's database and cookie keys to restore fixtures on next startup.
docker compose -f .devcontainer/docker-compose.sandbox.yml down --volumes
docker compose -f .devcontainer/docker-compose.sandbox.yml up --build --wait
```

Seeding does not overwrite existing weather rows or duplicate them on restart. A volume reset recreates the database from migrations and the fixed January 1–10, 2025 fixtures. Mailpit's inbox is temporary and clears when its container stops.

The sandbox copies source at build time. It does not mount the checkout or hot reload. Use the regular development workflow for hot reload. Docker excludes host `.env` files, keys, dependencies, and build outputs using `.dockerignore`.

## Ports and multiple sandboxes

Only the app and inbox publish ports, both bound to `127.0.0.1`. SQL is reachable on the Compose network as `sql:1433`, with the disposable credentials in the Compose file. The default project name is `web-app-template-sandbox`, separate from `web-app-template_devcontainer`.

For a second checkout, choose another Compose project and host ports. Use the same values for subsequent commands, especially resets:

```bash
SANDBOX_PORT=5281 SANDBOX_MAIL_PORT=8026 docker compose -p template-review -f .devcontainer/docker-compose.sandbox.yml up --build --wait
```

Local authentication is opt-in with `Auth__UseLocal=true` and allowed only in `Development`. The local cookie uses its own authentication scheme and name. Login and logout are POST forms with antiforgery validation, and login accepts only local return URLs. Keep the sandbox bound to loopback; anyone who can reach it can choose a fictional user.

SQL Server uses its Linux AMD64 image. On Apple Silicon, Docker Desktop needs AMD64 emulation enabled. If SQL stays unhealthy, inspect `docker compose -f .devcontainer/docker-compose.sandbox.yml logs sql` and Docker's available memory. SQL Server needs at least 2 GB of memory, with additional room for the build and app.

## Checks and agent use

Run the backend tests, client tests, and client lint using the container SDKs:

```bash
docker build -f .devcontainer/sandbox.Dockerfile --target checks .
```

The regular sandbox build runs the TypeScript and production asset build. The `checks` target also runs the auth configuration tests, including rejection of local sign-in outside Development.

Agents can use a host browser at `http://localhost:5280` or join the Compose network from a browser container and visit `http://sandbox.test:8080`. The `sandbox.test` network alias avoids Chromium's automatic HTTPS upgrade for the `app` hostname. Follow the sign-in form so the browser receives a real cookie. Do not replace `/api/user/me` or the weather endpoint with mocks when verifying the sandbox.

Useful commands inside the app and database containers:

```bash
docker compose -f .devcontainer/docker-compose.sandbox.yml exec app curl --fail http://localhost:8080/health
docker compose -f .devcontainer/docker-compose.sandbox.yml exec sql /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P 'SandboxOnly123!' -C -d SandboxDb -Q 'SELECT * FROM WeatherForecasts ORDER BY Date'
```
