FROM node:22-bookworm-slim AS node

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
COPY --from=node /usr/local/ /usr/local/
WORKDIR /workspace
COPY . .
RUN dotnet publish server/server.csproj --configuration Release --output /app/server

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS app
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /app/.aspnet \
    && chown app:app /app/.aspnet
WORKDIR /app/server
COPY --from=build /app/server .
USER app
EXPOSE 8080
ENTRYPOINT ["dotnet", "server.dll"]
