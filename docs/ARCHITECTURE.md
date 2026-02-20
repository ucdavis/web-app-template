# Development Architecture

## Overview

This template uses a clean separation of concerns between project dependencies and development orchestration.

## Components

### 1. Project-Level Dependencies (Source Control)

**Location**: `server/server.csproj`

The project declares its runtime dependencies, including:
- YARP.ReverseProxy (for development proxy)
- ASP.NET Core packages
- Authentication libraries
- Database providers

**Why**: These are **intrinsic to the application** and must be version-controlled. Any developer cloning the repository needs these dependencies to build and run the project.

### 2. Development Orchestration (DevContainer)

**Location**: `.devcontainer/devcontainer.json`

The DevContainer is responsible for:
- Installing Node.js runtime
- Installing dependencies (`postCreateCommand`)
- Starting both processes simultaneously (`postStartCommand`)
- Port forwarding configuration

**Why**: This is **environment setup**, not application logic. DevContainer ensures all developers have a consistent development environment.

### 3. Developer Convenience (Root package.json)

**Location**: `package.json` (root)

Provides shorthand commands for local development:
```json
{
  "dev": "concurrently \"dotnet watch\" \"cd client && npm run dev\""
}
```

**Why**: Makes it easy to run both processes with a single command outside of DevContainer.

## Request Flow

### Development Mode

```
User Browser → :5165 (ASP.NET Core)
                 ↓
        ┌────────┴────────┐
        │                 │
    /api/*            everything else
        │                 │
        ↓                 ↓
   Controllers      YARP Proxy → :5173 (Vite)
                                    ↓
                                React App
```

1. Developer visits `http://localhost:5165`
2. ASP.NET Core receives the request
3. Request routing:
   - `/api/*`, `/health`, `/swagger` → Backend controllers
   - Everything else → YARP proxy → Vite dev server (`:5173`)
4. Vite returns React app with HMR enabled
5. Frontend makes API calls to `/api/*` (same origin, cookies work)

### Production Mode

```
User Browser → :5165 (ASP.NET Core)
                 ↓
        ┌────────┴────────┐
        │                 │
    /api/*            everything else
        │                 │
        ↓                 ↓
   Controllers      Static Files (wwwroot/)
                                    ↓
                              index.html (SPA)
```

1. User visits production URL
2. ASP.NET Core receives the request
3. Request routing:
   - `/api/*` → Backend controllers
   - Static assets → Served from `wwwroot/`
   - Everything else → Falls back to `index.html` for client-side routing

## Key Files

### server/Program.cs

**Responsibilities**:
- Configure YARP in development mode
- Serve static files in production mode
- Define routing logic (controllers vs. proxy)

**Development-specific code**:
```csharp
if (builder.Environment.IsDevelopment())
{
    builder.Services.AddReverseProxy()
        .LoadFromMemory([...]);  // Proxy config
}
```

**Production-specific code**:
```csharp
if (!app.Environment.IsDevelopment())
{
    app.UseDefaultFiles();
    app.UseStaticFiles();
    app.MapFallbackToFile("/index.html");
}
```

### .devcontainer/devcontainer.json

**Responsibilities**:
- Install Node.js and .NET runtimes
- Run setup scripts
- Start both processes concurrently
- Forward port 5165 to host

**Key settings**:
```json
{
  "postCreateCommand": "bash .devcontainer/setup.sh",
  "postStartCommand": "bash .devcontainer/wait-for-sql.sh && npm run dev",
  "forwardPorts": [5165]
}
```

### package.json (root)

**Responsibilities**:
- Define convenience scripts for developers
- Declare orchestration dependencies (concurrently)

**Key scripts**:
```json
{
  "dev": "concurrently \"dotnet watch\" \"cd client && npm run dev\""
}
```

## Benefits of This Architecture

### 1. Clean Separation of Concerns

| Layer | Responsibility | Committed to Git |
|-------|---------------|------------------|
| server.csproj | YARP dependency | ✅ |
| Program.cs | Routing + proxy logic | ✅ |
| DevContainer | Process orchestration | ✅ |
| Root package.json | Developer convenience | ✅ |

### 2. Cross-Platform Compatibility

- **Visual Studio users**: Can run backend and frontend separately or use `npm run dev`
- **VS Code + DevContainer users**: Everything starts automatically
- **Command-line users**: `npm run dev` works everywhere

### 3. Single Port Development

- All requests go through `:5165`
- Same-origin authentication cookies work correctly
- No CORS configuration needed
- Simulates production routing

### 4. Production Parity

Development proxy mimics production serving behavior:
- API routes work identically
- Static file serving is production-like
- Client-side routing fallback is consistent

### 5. No Magic Process Spawning

The backend doesn't start Vite (unlike ASP.NET SPA Proxy). This is more stable and predictable:
- Each process is independently manageable
- Better error reporting
- Works with all IDEs and editors
- Easier to debug

## Troubleshooting

### Frontend not loading

**Check**: Is Vite running?
```bash
curl http://localhost:5173
```

If not, start it manually:
```bash
cd client && npm run dev
```

### API calls failing

**Check**: Is the backend running?
```bash
curl http://localhost:5165/health
```

If not, start it manually:
```bash
dotnet watch --project server/server.csproj
```

### Changes not hot-reloading

**Frontend**: Check the browser console for HMR connection errors. Vite HMR connects via WebSocket to `:5173`, which is proxied through `:5165`.

**Backend**: `dotnet watch` should automatically restart on file changes. Check the terminal for compilation errors.

### Port conflicts

If `:5165` or `:5173` are in use:
- Change `ASPNETCORE_URLS` in `.devcontainer/devcontainer.json` or `.env`
- Update Vite port in `client/vite.config.ts`
- Update YARP proxy target in `server/Program.cs`

## Future Considerations

### Alternative: Docker Compose

For teams preferring Docker Compose over DevContainer, the same principles apply:
```yaml
services:
  backend:
    build: ./server
    ports:
      - "5165:5165"
  
  frontend:
    build: ./client
    ports:
      - "5173:5173"
```

Backend would still proxy to `frontend:5173` using YARP.

### Alternative: Standalone Proxy

Instead of embedding the proxy in the backend, you could use a standalone reverse proxy (nginx, Caddy, Traefik). However, this adds complexity and reduces parity with production (which doesn't have a separate proxy).

### Alternative: Vite Proxy (Not Recommended)

Vite can proxy API requests to the backend, but this inverts the architecture:
- Frontend is the entry point (`:5173`)
- Breaks authentication cookies (different origins)
- Requires CORS configuration
- Doesn't match production routing

This approach is **not recommended** for this template.
