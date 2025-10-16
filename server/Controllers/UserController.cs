using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;

namespace Server.Controllers;

public class UserController : ApiControllerBase
{
    [HttpGet("me")]
    public IActionResult Me()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var userName = User.FindFirst("name")?.Value;
        var userEmail = User.FindFirst("preferred_username")?.Value;

        var userRoles = User.FindAll(ClaimTypes.Role).Select(c => c.Value).ToList();

        if (userId == null)
        {
            return Unauthorized();
        }

        var userInfo = new
        {
            Id = userId,
            Name = userName,
            Email = userEmail,
            Roles = userRoles,
        };

        return Ok(userInfo);
    }
}
