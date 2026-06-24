using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Server.Core.Data;
using Server.Core.Notification;
using Server.Helpers;
using Server.Models.PeopleLookup;
using Server.Services;

WebApplication? app = null;

try
{
    var builder = WebApplication.CreateBuilder(args);

    // setup configuration sources (last one wins)
    builder.Configuration
        .AddJsonFile("appsettings.json", optional: false, reloadOnChange: true)
        .AddJsonFile($"appsettings.{builder.Environment.EnvironmentName}.json", optional: true, reloadOnChange: true)
        .AddEnvFile(".env", optional: true) // secrets stored here
        .AddEnvFile($".env.{builder.Environment.EnvironmentName}", optional: true) // env-specific secrets
        .AddEnvironmentVariables(); // OS env vars override everything

    // setup logging and telemetry
    TelemetryHelper.ConfigureLogging(builder.Logging);
    TelemetryHelper.ConfigureOpenTelemetry(builder.Services);

    // handy for getting true client IP
    builder.Services.Configure<ForwardedHeadersOptions>(o =>
    {
        o.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    });

    builder.Services.AddControllers();
    builder.Services.AddNotificationServices(builder.Configuration);
    builder.Services.AddAuthenticationServices(builder.Configuration);
    builder.Services.AddAuthorization();
    builder.Services.AddResponseCaching();
    builder.Services.Configure<PeopleLookupOptions>(builder.Configuration.GetSection(PeopleLookupOptions.SectionName));
    builder.Services.AddHttpClient("identity", client =>
        {
            client.Timeout = TimeSpan.FromSeconds(30);
        })
        .ConfigurePrimaryHttpMessageHandler(() => new SocketsHttpHandler
        {
            PooledConnectionLifetime = TimeSpan.FromMinutes(2),
            PooledConnectionIdleTimeout = TimeSpan.FromMinutes(1),
            MaxConnectionsPerServer = 10
        });

    // add scoped services here
    builder.Services.AddScoped<IUserService, UserService>();
    builder.Services.AddScoped<IIdentityLookupService, IdentityLookupService>();
    builder.Services.AddScoped<IPeopleLookupPermissionService, PeopleLookupPermissionService>();
    // add auth policies here

    var healthChecks = builder.Services.AddHealthChecks();
    var databaseEnabled = builder.Configuration.GetValue("Database:Enabled", false);

    if (databaseEnabled)
    {
        // add db context (check secrets first, then config, then default)
        var conn = builder.Configuration["DB_CONNECTION"]
                   ?? builder.Configuration.GetConnectionString("DefaultConnection");

        if (string.IsNullOrWhiteSpace(conn))
        {
            const string message = "Database is enabled, but no connection string is configured. Set the DB_CONNECTION environment variable or " +
                                   "configure ConnectionStrings:DefaultConnection.";

            throw new InvalidOperationException(message);
        }

        builder.Services.AddScoped<IDbInitializer, DbInitializer>();
        builder.Services.AddDbContextPool<AppDbContext>(o => o.UseSqlServer(conn, opt => opt.MigrationsAssembly("server.core")));
        healthChecks.AddDbContextCheck<AppDbContext>();
    }

    // Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddSwaggerGen();

    // Configure data protection for auth cookies and related framework secrets.
    // This local key ring assumes one effective app instance. Before scaling out
    // or sharing cookies across deployment slots, move keys to shared storage such
    // as Azure Blob Storage or another ASP.NET Core Data Protection provider.
    var keysPath = Path.Combine(builder.Environment.ContentRootPath, "..", ".aspnet", "DataProtection-Keys");
    Directory.CreateDirectory(keysPath);

    builder.Services.AddDataProtection()
        .PersistKeysToFileSystem(new DirectoryInfo(keysPath));

    app = builder.Build();

    if (databaseEnabled)
    {
        // do db migrations at startup only when DB-backed features are explicitly enabled
        using var scope = app.Services.CreateScope();
        var init = scope.ServiceProvider.GetRequiredService<IDbInitializer>();
        var env = scope.ServiceProvider.GetRequiredService<IHostEnvironment>();
        await init.InitializeAsync(env.IsDevelopment());
    }

    app.UseForwardedHeaders();

    app.UseStaticFiles();

    app.UseResponseCaching();

    // Configure the HTTP request pipeline.
    if (app.Environment.IsDevelopment())
    {
        // swagger only in development
        app.UseSwagger();
        app.UseSwaggerUI();
    }
    else
    {
        app.UseDefaultFiles();

        // only use HTTPS redirection in non-development environments
        app.UseHttpsRedirection();
    }

    app.UseAuthentication();
    app.UseAuthorization();

    // enrich every log with request context
    app.UseRequestContextLogging();

    // app.UseHttpLogging(); // if you want extra logging. It's a little overkill though with the current logging setup

    app.MapControllers();

    var healthEndpoint = app.MapHealthChecks("/health");

    // Cache the health check response for 10 seconds to protect the database from rapid polling.
    healthEndpoint.WithMetadata(new ResponseCacheAttribute
    {
        Duration = 10,
        Location = ResponseCacheLocation.Any,
        NoStore = false,
    });

    if (!app.Environment.IsDevelopment())
    {
        // In production, fallback to index.html for SPA routing
        app.MapFallbackToFile("/index.html");
    }

    app.Run();
}
catch (Exception ex)
{
    StartupLoggingHelper.LogStartupFailure(app, ex);
    throw;
}
