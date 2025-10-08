# Web App Template

A full-stack web application template featuring a .NET 8 backend with React/Vite frontend, using OIDC authentication with Microsoft Entra ID.

## Architecture

- **Backend**: .NET 8 Web API with ASP.NET Core
- **Frontend**: React 19 with Vite, TypeScript, and TanStack Router/Query/Table
- **Authentication**: OIDC with Microsoft Entra ID (Azure AD)
- **Styling**: Tailwind CSS
- **Development**: Hot reload for both frontend and backend

## Quick Start

1. **Clone the repository**

   ```bash
   git clone https://github.com/ucdavis/web-app-template/
   cd web-app-template
   ```

2. **Start the application**

   ```bash
   npm start
   ```

   This command automatically installs dependencies and starts both the .NET backend and Vite frontend with hot reload enabled.

   _Optional: If dependencies change, you can manually reinstall with `npm install && cd client && npm install && cd ..` but you shouldn't have to, the `npm start` should handle it._

3. **Access the application**

The application will auto launch in your browser (to http://localhost:5173).

If you want to access endpoints individually, you can do so at the following URLs:

- Frontend: http://localhost:5173
- Backend API: http://localhost:5165
- API Documentation (Swagger): http://localhost:5165/swagger/index.html

### Database configuration

The backend requires a SQL Server connection string. Provide it by setting the `DB_CONNECTION` environment variable (for example in a `.env` file) or by updating `ConnectionStrings:DefaultConnection` in `appsettings.*.json`. `.env` is recommended but using appsettings is fine for local development, and provided so it'll work easily out of the box. When running against the included containerized SQL Server instance, use:

```
Server=sql,1433;Database=AppDb;User ID=sa;Password=LocalDev123!;Encrypt=False;TrustServerCertificate=True;
```

## Development

### Backend Development

The backend is configured with hot reload via `dotnet watch`. Any changes to C# files will automatically restart the server.

### Frontend Development

The frontend uses Vite's hot module replacement (HMR). Changes to React components, TypeScript files, and CSS will be reflected immediately.

### Authentication Flow

1. Frontend routes requiring authentication redirect to the backend's login endpoint
2. Backend handles OIDC flow with Microsoft Entra ID
3. Upon successful authentication, a same-site cookie is set
4. Frontend API calls automatically include the authentication cookie
5. Backend validates the cookie for protected endpoints

## Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── routes/        # TanStack Router routes
│   │   ├── queries/       # TanStack Query hooks
│   │   ├── lib/           # API client and utilities
│   │   └── shared/        # Shared components
│   ├── package.json
│   └── vite.config.ts
├── server/                # .NET backend
│   ├── Controllers/       # API controllers
│   ├── Helpers/          # Utility classes
│   ├── Properties/       # Launch settings
│   ├── Program.cs        # Application entry point
│   └── server.csproj
├── package.json          # Root package.json with start script
└── app.sln              # Visual Studio solution file
```

## Available Scripts

### Root Level

- `npm start` - Starts both backend and frontend with hot reload

### Client Directory

- `npm run dev` - Start Vite development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

### Server Directory

- `dotnet run` - Start the .NET application
- `dotnet watch` - Start with hot reload
- `dotnet build` - Build the application

## Technologies Used

### Backend

- .NET 8
- ASP.NET Core
- Microsoft.Identity.Web (OIDC)
- OpenTelemetry
- Swashbuckle (Swagger)

### Frontend

- React 19
- TypeScript
- Vite
- TanStack Router
- TanStack Query
- TanStack Table
- TanStack Form
- Tailwind CSS

## Production Deployment

1. **Build the application**

   ```bash
   cd client && npm run build && cd ..
   dotnet publish server/server.csproj -c Release
   ```

2. **Configure production settings**

   - Update `appsettings.json` with production values (non-secrets)
   - Update `.env` with secrets
   - Ensure proper CORS and security headers
   - Configure proper redirect URIs in Entra

3. **Deploy**
   - TBD, will use Azure DevOps

## License

This project is licensed under the MIT License.
