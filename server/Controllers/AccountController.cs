using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Server.Helpers;

namespace Server.Controllers;

[AllowAnonymous]
[ApiExplorerSettings(IgnoreApi = true)]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public class AccountController(IConfiguration configuration, IHostEnvironment environment) : Controller
{
    [HttpGet("login")]
    public IActionResult Login(string? returnUrl)
    {
        var safeReturnUrl = Url.IsLocalUrl(returnUrl) ? returnUrl! : "/";
        if (LocalAuthentication.IsEnabled(configuration, environment))
        {
            return View("LocalLogin", safeReturnUrl);
        }

        if (User.Identity?.IsAuthenticated == true)
        {
            return LocalRedirect(safeReturnUrl);
        }

        return Challenge(new AuthenticationProperties { RedirectUri = safeReturnUrl },
            OpenIdConnectDefaults.AuthenticationScheme);
    }

    [HttpPost("login/local")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> LocalLogin(string? persona, string? returnUrl)
    {
        if (!LocalAuthentication.IsEnabled(configuration, environment))
        {
            return NotFound();
        }

        var principal = LocalAuthentication.CreatePrincipal(persona);
        if (principal == null)
        {
            return BadRequest("Choose one of the listed sandbox users.");
        }

        await HttpContext.SignInAsync(LocalAuthentication.Scheme, principal);
        return LocalRedirect(Url.IsLocalUrl(returnUrl) ? returnUrl! : "/");
    }

    [HttpPost("logout/local")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> LocalLogout()
    {
        if (!LocalAuthentication.IsEnabled(configuration, environment))
        {
            return NotFound();
        }

        await HttpContext.SignOutAsync(LocalAuthentication.Scheme);
        return LocalRedirect("/login");
    }
}
