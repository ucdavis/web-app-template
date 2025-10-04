using System.Diagnostics;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.Identity.Web;
using OpenTelemetry.Logs;
using OpenTelemetry.Metrics;
using OpenTelemetry.Trace;

DotNetEnv.Env.Load(); // load environment variables from .env file

var builder = WebApplication.CreateBuilder(args);

// setup logging
builder.Logging.ClearProviders();
builder.Logging.AddJsonConsole(options =>
{
    options.IncludeScopes = true;
    options.UseUtcTimestamp = true;
});

builder.Logging.AddOpenTelemetry(logOptions =>
{
    logOptions.IncludeFormattedMessage = true; // keep original message
    logOptions.IncludeScopes = true;           // carry our scope props
    logOptions.ParseStateValues = true;        // structured state
    logOptions.AddOtlpExporter(); // read env vars for endpoint
});

builder.Services.AddOpenTelemetry()
    .WithTracing(t => t
            .SetSampler(new TraceIdRatioBasedSampler(0.2))
            .AddAspNetCoreInstrumentation()
            .AddHttpClientInstrumentation()
            .AddOtlpExporter()
    )
    .WithMetrics(m => m
            .AddAspNetCoreInstrumentation()
            .AddHttpClientInstrumentation()
            .AddOtlpExporter()
    );

// handy for getting true client IP
builder.Services.Configure<ForwardedHeadersOptions>(o =>
{
    o.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
});

// Add services to the container.
builder.Services
    .AddAuthentication(OpenIdConnectDefaults.AuthenticationScheme)
    .AddMicrosoftIdentityWebApp(options =>
    {
        builder.Configuration.Bind("Auth", options);

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

            // Send the domain hint so users are routed straight to your org’s HRD
            ctx.ProtocolMessage.DomainHint = "ucdavis.edu"; // or "organizations"/"consumers" in other cases

            return Task.CompletedTask;
        };
    });
builder.Services.AddControllers();

// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

app.UseForwardedHeaders();

app.UseDefaultFiles();
app.UseStaticFiles();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
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

// 3) One small middleware to enrich every log with request context
app.Use(async (ctx, next) =>
{
    // ASP.NET’s intrinsic request id + W3C trace context
    var requestId   = ctx.TraceIdentifier;
    var activity    = Activity.Current;
    var traceId     = activity?.TraceId.ToString();
    var spanId      = activity?.SpanId.ToString();

    // user info (name/ID if authenticated)
    var userName    = ctx.User.Identity?.IsAuthenticated == true
        ? (ctx.User.Identity?.Name ?? "authenticated")
        : "anonymous";

    // client IP (respects ForwardedHeaders above)
    var clientIp    = ctx.Connection.RemoteIpAddress?.ToString();

    // user agent
    var ua          = ctx.Request.Headers.UserAgent.ToString();

    // Make these available to all logs in this request
    using (app.Logger.BeginScope(new Dictionary<string, object?>
           {
               ["user.name"]   = userName,
               ["request.id"]  = requestId,
               ["trace.id"]    = traceId,
               ["span.id"]     = spanId,
               ["client.ip"]   = clientIp,
               ["user_agent.original"] = ua
           }))
    {
        await next();
    }
});

// app.UseHttpLogging(); // TODO: decide if we want this extra logging

app.MapControllers();

app.MapFallbackToFile("/index.html");

app.Run();
