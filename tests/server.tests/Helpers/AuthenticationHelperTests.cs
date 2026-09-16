using System.Security.Claims;
using FluentAssertions;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using Server.Helpers;
using Server.Services;

namespace Server.Tests.Helpers;

public class AuthenticationHelperTests : IDisposable
{
    private readonly ServiceProvider _provider;
    private readonly IServiceScope _scope;

    public AuthenticationHelperTests()
    {
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Auth:Instance"] = "https://login.microsoftonline.com/",
            ["Auth:TenantId"] = "11111111-1111-1111-1111-111111111111",
            ["Auth:ClientId"] = "22222222-2222-2222-2222-222222222222",
        }).Build();

        var services = new ServiceCollection();
        services.AddLogging();
        services.AddSingleton<IConfiguration>(configuration);
        services.AddScoped(_ => TestDbContextFactory.CreateInMemory());
        services.AddScoped<IUserService, UserService>();
        services.AddAuthenticationServices(configuration, new TestEnvironment());
        _provider = services.BuildServiceProvider();
        _scope = _provider.CreateScope();
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Sign_in_and_cookie_validation_use_only_application_roles(bool hasDirectoryRoles)
    {
        var principal = CreatePrincipal();
        if (hasDirectoryRoles)
        {
            ((ClaimsIdentity)principal.Identity!).AddClaim(new Claim(ClaimTypes.Role, "DirectoryRole"));
        }

        var signedIn = await ValidateToken(principal);
        var cookie = await ValidateCookie(signedIn);

        signedIn.FindAll(ClaimTypes.Role).Select(claim => claim.Value)
            .Should().BeEquivalentTo("User", "SampleRole");
        signedIn.Identity!.Name.Should().Be("Sample User");
        cookie.Principal.Should().BeSameAs(signedIn);
        cookie.ShouldRenew.Should().BeFalse();
    }

    [Theory]
    [InlineData("User", "RemovedRole")]
    [InlineData("User", "User")]
    public async Task Cookie_validation_replaces_stale_or_duplicate_roles(string firstRole, string secondRole)
    {
        var principal = CreatePrincipal();
        var identity = (ClaimsIdentity)principal.Identity!;
        identity.AddClaim(new Claim(ClaimTypes.Role, firstRole));
        identity.AddClaim(new Claim(ClaimTypes.Role, secondRole));

        var cookie = await ValidateCookie(principal);

        cookie.Principal!.FindAll(ClaimTypes.Role).Select(claim => claim.Value)
            .Should().BeEquivalentTo("User", "SampleRole");
        cookie.Principal.Identity!.Name.Should().Be("Sample User");
        cookie.Principal.FindFirst("ucdPersonIAMID")!.Value.Should().Be("sandbox-10001");
        cookie.ShouldRenew.Should().BeTrue();
        principal.FindAll(ClaimTypes.Role).Select(claim => claim.Value)
            .Should().Equal(firstRole, secondRole);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    public async Task Sign_in_and_cookie_validation_leave_a_missing_user_id_unchanged(string? userId)
    {
        var principal = CreatePrincipal(userId);

        var signedIn = await ValidateToken(principal);
        var cookie = await ValidateCookie(signedIn);

        signedIn.Should().BeSameAs(principal);
        cookie.Principal.Should().BeSameAs(principal);
        cookie.ShouldRenew.Should().BeFalse();
        principal.FindAll(ClaimTypes.Role).Should().BeEmpty();
    }

    [Fact]
    public async Task Role_updates_preserve_identities_and_non_role_claims_without_mutating_the_input()
    {
        var principal = CreatePrincipal();
        var primary = (ClaimsIdentity)principal.Identity!;
        primary.Label = "Entra identity";
        primary.AddClaim(new Claim(ClaimTypes.Role, "DirectoryRole"));
        var secondary = new ClaimsIdentity(
            [new Claim("department", "Example department"), new Claim(ClaimTypes.Role, "OldRole")],
            "AdditionalIdentity");
        principal.AddIdentity(secondary);

        var signedIn = await ValidateToken(principal);

        signedIn.Identities.Should().HaveCount(2);
        var updatedPrimary = signedIn.Identities.First();
        updatedPrimary.AuthenticationType.Should().Be(primary.AuthenticationType);
        updatedPrimary.NameClaimType.Should().Be(primary.NameClaimType);
        updatedPrimary.RoleClaimType.Should().Be(primary.RoleClaimType);
        updatedPrimary.Label.Should().Be(primary.Label);
        updatedPrimary.Name.Should().Be("Sample User");
        updatedPrimary.FindFirst("ucdPersonIAMID")!.Value.Should().Be("sandbox-10001");
        var updatedSecondary = signedIn.Identities.Last();
        updatedSecondary.AuthenticationType.Should().Be("AdditionalIdentity");
        updatedSecondary.FindFirst("department")!.Value.Should().Be("Example department");
        updatedSecondary.FindAll(ClaimTypes.Role).Should().BeEmpty();
        signedIn.FindAll(ClaimTypes.Role).Select(claim => claim.Value)
            .Should().BeEquivalentTo("User", "SampleRole");
        principal.FindAll(ClaimTypes.Role).Select(claim => claim.Value)
            .Should().Equal("DirectoryRole", "OldRole");
    }

    [Theory]
    [InlineData(false, ClaimTypes.Role)]
    [InlineData(true, ClaimTypes.Role)]
    [InlineData(false, "application-role")]
    [InlineData(true, "application-role")]
    public async Task Role_updates_honor_each_identity_role_claim_type(bool validateCookie, string primaryRoleClaimType)
    {
        var primary = new ClaimsIdentity(CreatePrincipal().Claims, "OpenIdConnect", "name", primaryRoleClaimType);
        primary.AddClaim(new Claim(primaryRoleClaimType, "User"));
        primary.AddClaim(new Claim(primaryRoleClaimType, "SampleRole"));
        var secondary = new ClaimsIdentity(
            [new Claim("secondary-role", "StaleRole"), new Claim("department", "Example department")],
            "AdditionalIdentity", "name", "secondary-role");
        var principal = new ClaimsPrincipal([primary, secondary]);
        principal.IsInRole("StaleRole").Should().BeTrue();

        ClaimsPrincipal updated;
        if (validateCookie)
        {
            var cookie = await ValidateCookie(principal);
            cookie.ShouldRenew.Should().BeTrue();
            updated = cookie.Principal!;
        }
        else
        {
            updated = await ValidateToken(principal);
        }

        updated.IsInRole("StaleRole").Should().BeFalse();
        updated.IsInRole("User").Should().BeTrue();
        updated.IsInRole("SampleRole").Should().BeTrue();
        updated.Identities.First().RoleClaimType.Should().Be(primaryRoleClaimType);
        updated.Identities.Last().RoleClaimType.Should().Be("secondary-role");
        updated.FindFirst("department")!.Value.Should().Be("Example department");
        principal.IsInRole("StaleRole").Should().BeTrue();
    }

    private static ClaimsPrincipal CreatePrincipal(string? userId = "sample-user")
    {
        var claims = new List<Claim>
        {
            new("name", "Sample User"),
            new("ucdPersonIAMID", "sandbox-10001"),
        };
        if (userId != null)
        {
            claims.Add(new Claim(ClaimTypes.NameIdentifier, userId));
        }

        return new ClaimsPrincipal(new ClaimsIdentity(claims, "OpenIdConnect", "name", ClaimTypes.Role));
    }

    private async Task<ClaimsPrincipal> ValidateToken(ClaimsPrincipal principal)
    {
        var options = _scope.ServiceProvider.GetRequiredService<IOptionsMonitor<OpenIdConnectOptions>>()
            .Get(OpenIdConnectDefaults.AuthenticationScheme);
        var scheme = new AuthenticationScheme(OpenIdConnectDefaults.AuthenticationScheme, null, typeof(OpenIdConnectHandler));
        var context = new TokenValidatedContext(
            new DefaultHttpContext { RequestServices = _scope.ServiceProvider }, scheme, options, principal, new AuthenticationProperties());

        await options.Events.TokenValidated(context);

        return context.Principal!;
    }

    private async Task<CookieValidatePrincipalContext> ValidateCookie(ClaimsPrincipal principal)
    {
        var options = _scope.ServiceProvider.GetRequiredService<IOptionsMonitor<CookieAuthenticationOptions>>()
            .Get(CookieAuthenticationDefaults.AuthenticationScheme);
        var scheme = new AuthenticationScheme(CookieAuthenticationDefaults.AuthenticationScheme, null, typeof(CookieAuthenticationHandler));
        var ticket = new AuthenticationTicket(principal, new AuthenticationProperties(), scheme.Name);
        var context = new CookieValidatePrincipalContext(
            new DefaultHttpContext { RequestServices = _scope.ServiceProvider }, scheme, options, ticket);

        await options.Events.ValidatePrincipal(context);

        return context;
    }

    public void Dispose()
    {
        _scope.Dispose();
        _provider.Dispose();
    }

    private sealed class TestEnvironment : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = Environments.Production;
        public string ApplicationName { get; set; } = "Server.Tests";
        public string ContentRootPath { get; set; } = "/";
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}
