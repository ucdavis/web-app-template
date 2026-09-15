using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.Routing;
using Microsoft.AspNetCore.Routing;
using Server.Controllers;

namespace Server.Tests.Controllers;

public class AccountControllerTests
{
    [Theory]
    [InlineData(null, "/")]
    [InlineData("", "/")]
    [InlineData("https://example.test/phishing", "/")]
    [InlineData("//example.test/phishing", "/")]
    [InlineData("/\\example.test/phishing", "/")]
    [InlineData("/fetch?sort=date", "/fetch?sort=date")]
    [InlineData("~/me", "~/me")]
    public void Login_only_redirects_to_local_paths(string? returnUrl, string expectedUrl)
    {
        var actionContext = new ActionContext(new DefaultHttpContext(), new RouteData(), new ActionDescriptor());
        var controller = new AccountController
        {
            Url = new UrlHelper(actionContext),
        };

        var result = controller.Login(returnUrl);

        result.Should().BeOfType<LocalRedirectResult>().Which.Url.Should().Be(expectedUrl);
    }
}
