using FluentAssertions;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Routing;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Server.Controllers;
using Server.Helpers;

namespace Server.Tests;

public class LocalAuthenticationTests
{
    [Theory]
    [InlineData("Production")]
    [InlineData("test")]
    [InlineData("Staging")]
    public void Local_auth_is_rejected_outside_development(string environment)
    {
        var configure = () => new ServiceCollection().AddAuthenticationServices(
            Configuration(local: "true"), new TestEnvironment(environment));

        configure.Should().Throw<InvalidOperationException>().WithMessage("*only allowed*Development*");
    }

    [Theory]
    [InlineData(null)]
    [InlineData("false")]
    public async Task Entra_remains_the_default_when_local_auth_is_not_enabled(string? local)
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddAuthenticationServices(Configuration(local, "11111111-1111-1111-1111-111111111111"),
            new TestEnvironment("Development"));
        await using var provider = services.BuildServiceProvider();
        var schemes = provider.GetRequiredService<IAuthenticationSchemeProvider>();

        (await schemes.GetDefaultAuthenticateSchemeAsync())!.Name.Should().Be(CookieAuthenticationDefaults.AuthenticationScheme);
        (await schemes.GetDefaultChallengeSchemeAsync())!.Name.Should().Be(OpenIdConnectDefaults.AuthenticationScheme);
        (await schemes.GetSchemeAsync(LocalAuthentication.Scheme)).Should().BeNull();
    }

    [Fact]
    public void Entra_still_requires_a_real_client_id()
    {
        var configure = () => new ServiceCollection().AddAuthenticationServices(
            Configuration(), new TestEnvironment("Development"));

        configure.Should().Throw<InvalidOperationException>().WithMessage("Auth:ClientId is not configured.*");
    }

    [Fact]
    public async Task Local_auth_does_not_register_Entra_or_need_its_configuration()
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddAuthenticationServices(Configuration("true"), new TestEnvironment("Development"));
        await using var provider = services.BuildServiceProvider();
        var schemes = provider.GetRequiredService<IAuthenticationSchemeProvider>();

        (await schemes.GetDefaultChallengeSchemeAsync())!.Name.Should().Be(LocalAuthentication.Scheme);
        (await schemes.GetSchemeAsync(OpenIdConnectDefaults.AuthenticationScheme)).Should().BeNull();
    }

    [Fact]
    public void Personas_exercise_the_existing_role_boundary()
    {
        var sample = LocalAuthentication.CreatePrincipal("sample")!;
        var basic = LocalAuthentication.CreatePrincipal("basic")!;

        sample.Identity!.IsAuthenticated.Should().BeTrue();
        sample.IsInRole("User").Should().BeTrue();
        sample.IsInRole("SampleRole").Should().BeTrue();
        basic.IsInRole("User").Should().BeTrue();
        basic.IsInRole("SampleRole").Should().BeFalse();
    }

    [Theory]
    [InlineData(null)]
    [InlineData("admin")]
    [InlineData("sample,Admin")]
    public void Login_rejects_unknown_personas(string? persona)
    {
        LocalAuthentication.CreatePrincipal(persona).Should().BeNull();
    }

    [Theory]
    [InlineData("https://example.com/")]
    [InlineData("//example.com/")]
    [InlineData("/\\example.com/")]
    public void Login_does_not_redirect_to_an_external_site(string returnUrl)
    {
        var controller = Controller(local: "true");

        var view = controller.Login(returnUrl).Should().BeOfType<ViewResult>().Subject;

        view.Model.Should().Be("/");
    }

    [Fact]
    public void Normal_login_challenges_Entra_with_the_local_return_url()
    {
        var controller = Controller();

        var challenge = controller.Login("/fetch?example=1").Should().BeOfType<ChallengeResult>().Subject;

        challenge.AuthenticationSchemes.Should().ContainSingle().Which.Should().Be(OpenIdConnectDefaults.AuthenticationScheme);
        challenge.Properties!.RedirectUri.Should().Be("/fetch?example=1");
    }

    [Fact]
    public async Task Local_login_and_logout_are_unavailable_by_default()
    {
        var controller = Controller();

        (await controller.LocalLogin("sample", "/")).Should().BeOfType<NotFoundResult>();
        (await controller.LocalLogout()).Should().BeOfType<NotFoundResult>();
    }

    private static AccountController Controller(string? local = null)
    {
        var controller = new AccountController(Configuration(local), new TestEnvironment("Development"))
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext(),
                RouteData = new RouteData(),
            },
        };
        controller.Url = new UrlHelper(controller.ControllerContext);
        return controller;
    }

    private static IConfiguration Configuration(string? local = null, string clientId = "<client-guid>") =>
        new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Auth:UseLocal"] = local,
            ["Auth:ClientId"] = clientId,
        }).Build();

    private sealed class TestEnvironment(string name) : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = name;
        public string ApplicationName { get; set; } = "Server.Tests";
        public string ContentRootPath { get; set; } = "/";
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}
