This file records how the frontend is wired into the template.

The client app was originally created with:

- `create-vite`
- the `react-ts` template

The template now integrates the frontend like this:

- Vite serves the React app on port `5173` during development.
- `client/vite.config.ts` proxies `/api`, `/login`, `/signin-oidc`, and `/health` to the ASP.NET Core backend.
- `server/server.csproj` uses ASP.NET Core `SpaProxy` so Visual Studio can start Vite without a separate `.esproj`.
- `server/server.csproj` also builds `client/dist` during publish and copies the output into `server/wwwroot`.

There is intentionally no standalone JavaScript project file in the solution anymore.
