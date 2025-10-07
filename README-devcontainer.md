# Dev Container (Simplified)

This dev container provides:

- Node.js 22
- .NET 8 SDK
- Azure SQL Edge (native on Apple Silicon)
- EF Core tooling auto-restored (dotnet-ef)
- Automatic database migration on start

## Quick Start

1. Open in VS Code
2. Run: Dev Containers: Reopen in Container
3. After build:

   - Run the app with: `npm start`

4. If you want to test each part separately:
   - Frontend: `cd client && npm run dev`
   - API (hot reload): `cd server && dotnet watch run`
   - DB: `sqlcmd -S localhost,14333 -U sa -P LocalDev123! -Q "SELECT @@VERSION;"`

## Password

`sa` password is `LocalDev123!` (meets SQL complexity; do not use in production!!!).

## Connection String

Inside container:

```
Server=sql,1433;Database=AppDb;User ID=sa;Password=LocalDev123!;Encrypt=False;TrustServerCertificate=True;
```

Outside (host):

```
Server=localhost,14333;Database=AppDb;User ID=sa;Password=LocalDev123!;Encrypt=False;TrustServerCertificate=True;
```

## EF Core

Tools manifest lives at `.config/dotnet-tools.json`. The container runs:

```
dotnet tool restore
```

on create so it'll be ready to use.

Add a migration:

```
cd server
dotnet ef migrations add SomeChange
dotnet ef database update
```

## Health Check

TBD

## Switching to Full SQL Server

Edit `docker-compose.yml` sql service:

- Replace image with `mcr.microsoft.com/mssql/server:2022-latest`
- Change `ACCEPT_EULA` to `"Y"`

Probably don't want to do that if you are on a Mac. Maybe not even on Windows.
