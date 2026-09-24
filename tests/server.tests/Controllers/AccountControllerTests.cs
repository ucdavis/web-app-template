using System.Security.Claims;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.Routing;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
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
        var httpContext = new DefaultHttpContext
        {
            User = new ClaimsPrincipal(new ClaimsIdentity([], "TestAuth")),
        };
        var actionContext = new ActionContext(httpContext, new RouteData(), new ActionDescriptor());
        var controller = new AccountController(new ConfigurationBuilder().Build(), new TestEnvironment())
        {
            ControllerContext = new ControllerContext { HttpContext = httpContext },
            Url = new UrlHelper(actionContext),
        };

        var result = controller.Login(returnUrl);

        result.Should().BeOfType<LocalRedirectResult>().Which.Url.Should().Be(expectedUrl);
    }

    private sealed class TestEnvironment : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = Environments.Development;
        public string ApplicationName { get; set; } = "Server.Tests";
        public string ContentRootPath { get; set; } = "/";
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}
