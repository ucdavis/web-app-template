using System.Security.Claims;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Server.Controllers;

namespace Server.Tests.Controllers;

public class UserControllerTests
{
    [Fact]
    public void Me_returns_iam_id_claim()
    {
        var controller = CreateController("123456789");

        var result = controller.Me();

        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        using var json = JsonDocument.Parse(JsonSerializer.Serialize(okResult.Value));
        json.RootElement.GetProperty("IamId").GetString().Should().Be("123456789");
    }

    [Fact]
    public void Me_returns_null_iam_id_when_claim_is_missing()
    {
        var controller = CreateController();

        var result = controller.Me();

        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        using var json = JsonDocument.Parse(JsonSerializer.Serialize(okResult.Value));
        json.RootElement.GetProperty("IamId").ValueKind.Should().Be(JsonValueKind.Null);
    }

    private static UserController CreateController(string? iamId = null)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, "user-1"),
            new("name", "Test User"),
            new("preferred_username", "test@example.com"),
        };

        if (iamId != null)
        {
            claims.Add(new Claim("ucdPersonIAMID", iamId));
        }

        var user = new ClaimsPrincipal(new ClaimsIdentity(claims, "TestAuth"));

        return new UserController
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = user,
                },
            },
        };
    }
}
