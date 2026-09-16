# Docker sandbox

The sandbox packages the current checkout into an image and runs it with SQL Server and Mailpit. ASP.NET Core serves the compiled React frontend, API, and local login on one origin. It uses the same EF migrations, controllers, role checks, and notification renderer as the regular app.

## Start and inspect

Follow the [README quick start](../README.md#run-the-docker-sandbox) to build and open the sandbox. Run commands from the repository root. This Compose file is standalone; do not combine it with the regular development Compose file.

```bash
docker compose -f .devcontainer/docker-compose.sandbox.yml ps
docker compose -f .devcontainer/docker-compose.sandbox.yml logs --tail=100 app
```

The app health check at `/health` verifies SQL connectivity after migrations and seeding finish. Compose waits for SQL and Mailpit health before starting the app.

Try these flows:

1. Sign in as Sample User, open Fetch, and page through the fixed weather records.
2. Open Table Export and download the example CSV. Open Form to try validation.
3. Open Notification and send either example. Read the rendered email in the local inbox linked in the quick start. Mailpit captures all recipients locally and has no relay configured.
4. Visit `/login`, switch to Basic User, and request `/api/weatherforecast`. It returns `403` because this user lacks `SampleRole`. `/api/user/me` still returns their identity.
5. Visit `/login` and sign out. `/api/user/me` returns `401`. The public `/about` page still opens.

Sample User has ID `sandbox-sample`, email `sample@example.test`, IAM ID `sandbox-10001`, and roles `User` and `SampleRole`. Basic User has ID `sandbox-basic`, email `basic@example.test`, IAM ID `sandbox-10002`, and only `User`. They are fixed claims, not database user rows. Extend `LocalAuthentication.cs` when adding application roles, and `DbInitializer.cs` when adding fixtures.

## Stop, rebuild, and reset

To stop the sandbox and preserve the database and cookie keys:

```bash
docker compose -f .devcontainer/docker-compose.sandbox.yml down
```

Use the [README rebuild and reset commands](../README.md#run-the-docker-sandbox) to restart from current source or restore the original fixtures. See [Database configuration](../README.md#database-configuration) for the seeding policy. Mailpit's inbox is temporary and clears when its container stops.

The sandbox copies source at build time. It does not mount the checkout or hot reload. Use the regular development workflow for hot reload. Docker excludes host `.env` files, keys, dependencies, and build outputs using `.dockerignore`.

## Ports and multiple sandboxes

Only the app and inbox publish ports, both bound to `127.0.0.1`. SQL is reachable on the Compose network as `sql:1433`, with the disposable credentials in the Compose file. The default project name is `web-app-template-sandbox`, separate from `web-app-template_devcontainer`.

For a second checkout, choose another Compose project and host ports. Use the same values for subsequent commands, especially resets:

```bash
SANDBOX_PORT=5281 SANDBOX_MAIL_PORT=8026 docker compose -p template-review -f .devcontainer/docker-compose.sandbox.yml up --build --wait
```

Compose sets `Auth__LocalCookieSuffix` to the project name so local sign-in and antiforgery cookies stay separate across sandboxes on different localhost ports.

See [Auth Configuration](../README.md#auth-configuration) for enabling local authentication and its environment restriction. The local cookie uses its own authentication scheme and name. Login and logout are POST forms with antiforgery validation, and login accepts only local return URLs. Keep the sandbox bound to loopback; anyone who can reach it can choose a fictional user.

SQL Server uses its Linux AMD64 image. On Apple Silicon, Docker Desktop needs AMD64 emulation enabled. If SQL stays unhealthy, inspect `docker compose -f .devcontainer/docker-compose.sandbox.yml logs sql` and Docker's available memory. SQL Server needs at least 2 GB of memory, with additional room for the build and app.

## Agent use

Agents can use the host URL in the [quick start](../README.md#run-the-docker-sandbox) or join the Compose network from a browser container and visit `http://sandbox.test:8080`. The `sandbox.test` network alias avoids Chromium's automatic HTTPS upgrade for the `app` hostname. Follow the sign-in form so the browser receives a real cookie. Do not replace `/api/user/me` or the weather endpoint with mocks when verifying the sandbox.

Useful commands inside the app and database containers:

```bash
docker compose -f .devcontainer/docker-compose.sandbox.yml exec app curl --fail http://localhost:8080/health
docker compose -f .devcontainer/docker-compose.sandbox.yml exec sql /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P 'SandboxOnly123!' -C -d SandboxDb -Q 'SELECT * FROM WeatherForecasts ORDER BY Date'
```
