using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Identity.Web;
using server.core.Data;
using server.Helpers;
using Server.Services;

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

// Add auth config (entra)
builder.Services
    .AddAuthentication(options =>
    {
        options.DefaultScheme = CookieAuthenticationDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = OpenIdConnectDefaults.AuthenticationScheme;
    })
    .AddMicrosoftIdentityWebApp(options =>
    {
        builder.Configuration.Bind("Auth", options);

        options.TokenValidationParameters = new()
        {
            NameClaimType = "name",
            RoleClaimType = ClaimTypes.Role
        };

        options.Events ??= new OpenIdConnectEvents();
        options.Events.OnRedirectToIdentityProvider = ctx =>
        {
            // If the request is for an API endpoint, don't redirect to the login page
            if (ctx.Request.Path.StartsWithSegments("/api"))
            {
                ctx.Response.StatusCode = 401;
                ctx.HandleResponse();
                return Task.CompletedTask;
            }

            ctx.ProtocolMessage.DomainHint = "ucdavis.edu";

            return Task.CompletedTask;
        };
        options.Events.OnTokenValidated = async ctx =>
        {
            // load up the roles on first login (can also change other user info/claims here if needed)
            var userService = ctx.HttpContext.RequestServices.GetRequiredService<IUserService>();
            var userId = ctx.Principal!.FindFirst("oid")?.Value
                    ?? ctx.Principal!.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId)) return;

            var roles = await userService.GetRolesForUser(userId);

            System.Console.WriteLine("Token validated, initial roles added");

            var id = (ClaimsIdentity)ctx.Principal.Identity!;
            foreach (var role in roles)
            {
                id.AddClaim(new Claim(ClaimTypes.Role, role));
            }
        };
    });

builder.Services.PostConfigure<CookieAuthenticationOptions>(CookieAuthenticationDefaults.AuthenticationScheme, options =>
{
    options.Events = new CookieAuthenticationEvents
    {
        OnValidatePrincipal = async ctx =>
        {
            // on every request with a cookie, check if the user's roles/claims need updating
            // we could use a cache here or roleVersion or timestamp or something, but for simplicity we'll just hit the DB every time
            var userService = ctx.HttpContext.RequestServices.GetRequiredService<IUserService>();
            var updated = await userService.UpdateUserPrincipalIfNeeded(ctx.Principal!);

            System.Console.WriteLine("Validating cookie principal");
            if (updated != null)
            {
                ctx.ReplacePrincipal(updated);
                ctx.ShouldRenew = true; // renew the cookie with the new principal
            }
        }
    };
});

builder.Services.AddControllers();

// Add response caching for pages that opt-in
// https://learn.microsoft.com/en-us/aspnet/core/performance/caching/middleware?view=aspnetcore-9.0
builder.Services.AddResponseCaching();

// add scoped services here
builder.Services.AddScoped<IDbInitializer, DbInitializer>();
builder.Services.AddScoped<IUserService, UserService>();
// add auth policies here

// add db context (check secrets first, then config, then default)
var conn = builder.Configuration["DB_CONNECTION"]
            ?? builder.Configuration.GetConnectionString("DefaultConnection");

if (string.IsNullOrWhiteSpace(conn))
{
    const string message = "No database connection string configured. Set the DB_CONNECTION environment variable or " +
                           "configure ConnectionStrings:DefaultConnection. For local containers use " +
                           "Server=sql,1433;Database=AppDb;User ID=sa;Password=LocalDev123!;Encrypt=False;TrustServerCertificate=True;.";

    throw new InvalidOperationException(message);
}

builder.Services.AddDbContextPool<AppDbContext>(o => o.UseSqlServer(conn, opt => opt.MigrationsAssembly("server.core")));

builder.Services
    .AddHealthChecks()
    .AddDbContextCheck<AppDbContext>();

// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// configure data protection (generated keys for auth and such)
var keysPath = Path.Combine(builder.Environment.ContentRootPath, "..", ".aspnet", "DataProtection-Keys");
Directory.CreateDirectory(keysPath);

builder.Services.AddDataProtection()
    .PersistKeysToFileSystem(new DirectoryInfo(keysPath));

var app = builder.Build();

// do db migrations at startup
using (var scope = app.Services.CreateScope())
{
    var init = scope.ServiceProvider.GetRequiredService<IDbInitializer>();
    var env = scope.ServiceProvider.GetRequiredService<IHostEnvironment>();
    await init.InitializeAsync(env.IsDevelopment());
}

app.UseForwardedHeaders();

app.UseDefaultFiles();
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


app.MapFallbackToFile("/index.html");

app.Run();
