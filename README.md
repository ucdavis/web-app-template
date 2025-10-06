# Web App Template

A full-stack web application template featuring a .NET 8 backend with React/Vite frontend, using OIDC authentication with Microsoft Entra ID.

## Architecture

- **Backend**: .NET 8 Web API with ASP.NET Core
- **Frontend**: React 19 with Vite, TypeScript, and TanStack Router/Query/Table
- **Authentication**: OIDC with Microsoft Entra ID (Azure AD)
- **Styling**: Tailwind CSS
- **Development**: Hot reload for both frontend and backend

## Features

- ✅ OIDC authentication with Microsoft Entra ID
- ✅ Same-site cookie sharing between frontend and backend
- ✅ API proxy from frontend to backend
- ✅ Hot reload development experience
- ✅ TypeScript support
- ✅ Modern React patterns with TanStack libraries
- ✅ OpenTelemetry integration
- ✅ ESLint and Prettier configuration

## Prerequisites

- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [Node.js](https://nodejs.org/) (v18 or later)
- npm (comes with Node.js)

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

   _Optional: If dependencies change, you can manually reinstall with `npm install && cd client && npm install && cd ..`_

3. **Access the application**

   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5165
   - API Documentation (Swagger): http://localhost:5165/swagger/index.html

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

   - Update `appsettings.json` with production values
   - Ensure proper CORS and security headers
   - Configure proper redirect URIs in Azure AD

3. **Deploy**
   - The built frontend files are included in the .NET publish output
   - Deploy the published application to your hosting platform

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

This project is licensed under the MIT License.
