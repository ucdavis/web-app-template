using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Server.Controllers;

public class AccountController : Controller
{
    [Authorize(AuthenticationSchemes = OpenIdConnectDefaults.AuthenticationScheme)] // trigger authentication
    [Route("login")]
    [ApiExplorerSettings(IgnoreApi = true)]
    public IActionResult Login(string? returnUrl)
    {
        // redirect to return url if it exists, otherwise /
        return Redirect(returnUrl ?? "/");
    }

}