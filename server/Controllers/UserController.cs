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

        if (userId == null)
        {
            return Unauthorized();
        }

        var userInfo = new
        {
            Id = userId,
            Name = userName,
            Email = userEmail,
            Claims = User.Claims.Select(c => new { c.Type, c.Value }).ToList()
        };

        return Ok(userInfo);
    }
}