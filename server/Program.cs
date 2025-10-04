using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.Identity.Web;
using server.Helpers;

DotNetEnv.Env.Load(); // load environment variables from .env file

var builder = WebApplication.CreateBuilder(args);

// setup logging and telemetry
TelemetryHelper.ConfigureLogging(builder.Logging);
TelemetryHelper.ConfigureOpenTelemetry(builder.Services);

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

// enrich every log with request context
app.UseRequestContextLogging();

// app.UseHttpLogging(); // TODO: decide if we want this extra logging

app.MapControllers();

app.MapFallbackToFile("/index.html");

app.Run();
