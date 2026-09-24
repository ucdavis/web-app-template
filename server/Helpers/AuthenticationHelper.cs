using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.Identity.Web;
using Server.Services;

namespace Server.Helpers;

public static class AuthenticationHelper
{
    /// <summary>
    /// Keeps Entra as the default; local sign-in must be explicitly enabled in Development.
    /// </summary>
    public static IServiceCollection AddAuthenticationServices(this IServiceCollection services, IConfiguration configuration, IHostEnvironment environment)
    {
        if (LocalAuthentication.IsEnabled(configuration, environment))
        {
            var cookieName = ".WebAppTemplate.LocalSandbox";
            var cookieSuffix = configuration["Auth:LocalCookieSuffix"];
            if (!string.IsNullOrEmpty(cookieSuffix))
            {
                cookieName += $".{cookieSuffix}";
                services.AddAntiforgery(options => options.Cookie.Name = $"{cookieName}.Antiforgery");
            }

            services.AddAuthentication(LocalAuthentication.Scheme)
                .AddCookie(LocalAuthentication.Scheme, options =>
                {
                    options.Cookie.Name = cookieName;
                    options.LoginPath = "/login";
                    options.Events.OnRedirectToLogin = ctx =>
                    {
                        if (ctx.Request.Path.StartsWithSegments("/api"))
                        {
                            ctx.Response.StatusCode = StatusCodes.Status401Unauthorized;
                        }
                        else
                        {
                            ctx.Response.Redirect(ctx.RedirectUri);
                        }
                        return Task.CompletedTask;
                    };
                    options.Events.OnRedirectToAccessDenied = ctx =>
                    {
                        ctx.Response.StatusCode = StatusCodes.Status403Forbidden;
                        return Task.CompletedTask;
                    };
                });
            return services;
        }

        var clientId = configuration["Auth:ClientId"]?.Trim();
        if (string.IsNullOrWhiteSpace(clientId) ||
            string.Equals(clientId, "<client-guid>", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                "Auth:ClientId is not configured. Replace the placeholder in server/appsettings.json or set the Auth__ClientId environment variable.");
        }

        services
            .AddAuthentication(options =>
            {
                options.DefaultScheme = CookieAuthenticationDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme = OpenIdConnectDefaults.AuthenticationScheme;
            })
            .AddMicrosoftIdentityWebApp(options =>
            {
                configuration.Bind("Auth", options);

                options.TokenValidationParameters = new()
                {
                    NameClaimType = "name",
                    RoleClaimType = ClaimTypes.Role
                };

                options.Events ??= new OpenIdConnectEvents();
                options.Events.OnRedirectToIdentityProvider = OnRedirectToIdentityProvider;
                options.Events.OnTokenValidated = OnTokenValidated;
            });

        services.PostConfigure<CookieAuthenticationOptions>(CookieAuthenticationDefaults.AuthenticationScheme, options =>
        {
            options.Events = new CookieAuthenticationEvents
            {
                OnValidatePrincipal = OnValidatePrincipal,
                OnRedirectToAccessDenied = ctx =>
                {
                    // If the request is for an API endpoint, don't redirect to the access denied page
                    if (ctx.Request.Path.StartsWithSegments("/api"))
                    {
                        ctx.Response.StatusCode = StatusCodes.Status403Forbidden;
                    }
                    return Task.CompletedTask;
                }
            };
        });

        return services;
    }

    /// <summary>
    /// Handles redirect to identity provider - prevents API endpoints from redirecting to login page
    /// </summary>
    private static Task OnRedirectToIdentityProvider(Microsoft.AspNetCore.Authentication.OpenIdConnect.RedirectContext ctx)
    {
        // If the request is for an API endpoint, don't redirect to the login page
        if (ctx.Request.Path.StartsWithSegments("/api"))
        {
            ctx.Response.StatusCode = 401;
            ctx.HandleResponse();
            return Task.CompletedTask;
        }

        // Set domain hint for UC Davis
        ctx.ProtocolMessage.DomainHint = "ucdavis.edu";

        return Task.CompletedTask;
    }

    /// <summary>
    /// Handles token validation - loads user roles on first login
    /// </summary>
    private static async Task OnTokenValidated(Microsoft.AspNetCore.Authentication.OpenIdConnect.TokenValidatedContext ctx)
    {
        var userService = ctx.HttpContext.RequestServices.GetRequiredService<IUserService>();
        var updated = await userService.UpdateUserPrincipalIfNeeded(ctx.Principal!);

        if (updated != null)
        {
            ctx.Principal = updated;
        }
    }

    /// <summary>
    /// Validates cookie principal on every request - updates user roles/claims if needed
    /// </summary>
    private static async Task OnValidatePrincipal(Microsoft.AspNetCore.Authentication.Cookies.CookieValidatePrincipalContext ctx)
    {
        var userService = ctx.HttpContext.RequestServices.GetRequiredService<IUserService>();
        var updated = await userService.UpdateUserPrincipalIfNeeded(ctx.Principal!);

        if (updated != null)
        {
            ctx.ReplacePrincipal(updated);
            ctx.ShouldRenew = true; // Renew the cookie with the new principal
        }
    }
}
