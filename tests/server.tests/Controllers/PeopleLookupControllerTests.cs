using System.Security.Claims;
using FluentAssertions;
using Ietws;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Server.Controllers;
using Server.Models.PeopleLookup;
using Server.Services;

namespace Server.Tests.Controllers;

public class PeopleLookupControllerTests
{
    [Fact]
    public async Task Search_uses_selected_search_type_and_text()
    {
        var identityLookupService = new FakeIdentityLookupService
        {
            LookupHandler = search => search == "person@example.com"
                ? Found(search, fullName: "Email Match")
                : NotFound(search)
        };
        var controller = CreateController(identityLookupService, allowSensitiveInfo: false);

        var response = await Search(controller, new BulkPeopleLookupRequest
        {
            SearchText = "Name <person@example.com>",
            SearchType = "email",
        });

        response.Results.Should().ContainSingle()
            .Which.FullName.Should().Be("Email Match");
        identityLookupService.Calls.Should().Equal("Lookup:person@example.com");
    }

    [Fact]
    public async Task Search_uses_sensitive_search_type_when_authorized()
    {
        var identityLookupService = new FakeIdentityLookupService
        {
            LookupIdHandler = (field, search) => field == PeopleSearchField.employeeId && search == "12345"
                ? Found(search, fullName: "Employee Match")
                : NotFound(search)
        };
        var controller = CreateController(identityLookupService, allowSensitiveInfo: true);

        var response = await Search(controller, new BulkPeopleLookupRequest
        {
            SearchText = "12345",
            SearchType = "employeeId",
        });

        response.Results.Should().ContainSingle()
            .Which.FullName.Should().Be("Employee Match");
        identityLookupService.Calls.Should().Equal("LookupId:employeeId:12345");
    }

    [Fact]
    public async Task Search_ignores_sensitive_search_type_when_unauthorized()
    {
        var identityLookupService = new FakeIdentityLookupService();
        var controller = CreateController(identityLookupService, allowSensitiveInfo: false);

        var response = await Search(controller, new BulkPeopleLookupRequest
        {
            SearchText = "12345",
            SearchType = "studentId",
        });

        response.Message.Should().Be("Sensitive identifier searches were ignored for your account.");
        response.Results.Should().BeEmpty();
        identityLookupService.Calls.Should().BeEmpty();
    }

    [Fact]
    public async Task Detail_extracts_email_before_lookup()
    {
        var identityLookupService = new FakeIdentityLookupService
        {
            LookupHandler = search => search == "person@example.com"
                ? Found(search, fullName: "Email Match")
                : NotFound(search)
        };
        var controller = CreateController(identityLookupService, allowSensitiveInfo: false);

        var response = await Detail(controller, "Email: person@example.com.");

        response.Results.Should().ContainSingle()
            .Which.FullName.Should().Be("Email Match");
        identityLookupService.Calls.Should().Equal("Lookup:person@example.com");
    }

    [Fact]
    public async Task Detail_tries_email_then_email_user_as_kerb()
    {
        var identityLookupService = new FakeIdentityLookupService
        {
            LookupHandler = search => search == "person"
                ? Found(search, fullName: "Kerb Match")
                : NotFound(search)
        };
        var controller = CreateController(identityLookupService, allowSensitiveInfo: false);

        var response = await Detail(controller, "person@example.com");

        response.Results.Should().ContainSingle()
            .Which.FullName.Should().Be("Kerb Match");
        identityLookupService.Calls.Should().Equal(
            "Lookup:person@example.com",
            "Lookup:person");
    }

    [Fact]
    public async Task Detail_tries_kerb_then_iam_id()
    {
        var identityLookupService = new FakeIdentityLookupService
        {
            LookupIdHandler = (field, search) => field == PeopleSearchField.iamId && search == "12345"
                ? Found(search, fullName: "IAM Match")
                : NotFound(search)
        };
        var controller = CreateController(identityLookupService, allowSensitiveInfo: true);

        var response = await Detail(controller, "12345");

        response.Results.Should().ContainSingle()
            .Which.FullName.Should().Be("IAM Match");
        identityLookupService.Calls.Should().Equal(
            "Lookup:12345",
            "LookupId:iamId:12345");
    }

    [Fact]
    public async Task Detail_tries_sensitive_ids_in_order_when_authorized()
    {
        var identityLookupService = new FakeIdentityLookupService
        {
            LookupIdHandler = (field, search) => field == PeopleSearchField.ppsId && search == "12345"
                ? Found(search, fullName: "PPS Match")
                : NotFound(search)
        };
        var controller = CreateController(identityLookupService, allowSensitiveInfo: true);

        var response = await Detail(controller, "12345");

        response.Results.Should().ContainSingle()
            .Which.FullName.Should().Be("PPS Match");
        identityLookupService.Calls.Should().Equal(
            "Lookup:12345",
            "LookupId:iamId:12345",
            "LookupId:employeeId:12345",
            "LookupId:studentId:12345",
            "LookupId:ppsId:12345");
    }

    [Fact]
    public async Task Detail_does_not_try_sensitive_ids_when_unauthorized()
    {
        var identityLookupService = new FakeIdentityLookupService
        {
            LookupIdHandler = (field, search) => field == PeopleSearchField.employeeId && search == "12345"
                ? Found(search, fullName: "Employee Match")
                : NotFound(search)
        };
        var controller = CreateController(identityLookupService, allowSensitiveInfo: false);

        var response = await Detail(controller, "12345");

        response.Results.Should().ContainSingle()
            .Which.Found.Should().BeFalse();
        identityLookupService.Calls.Should().Equal(
            "Lookup:12345",
            "LookupId:iamId:12345");
    }

    [Fact]
    public async Task Detail_hides_sensitive_fields_when_unauthorized()
    {
        var identityLookupService = new FakeIdentityLookupService
        {
            LookupIdHandler = (field, search) => field == PeopleSearchField.iamId && search == "12345"
                ? Found(search, fullName: "IAM Match", employeeId: "999")
                : NotFound(search)
        };
        var controller = CreateController(identityLookupService, allowSensitiveInfo: false);

        var response = await Detail(controller, "12345");

        var result = response.Results.Should().ContainSingle().Subject;
        result.Found.Should().BeTrue();
        result.EmployeeId.Should().BeNull();
    }

    private static async Task<PeopleLookupResponse> Search(
        PeopleLookupController controller,
        BulkPeopleLookupRequest request)
    {
        var actionResult = await controller.Search(request);
        var okResult = actionResult.Result.Should().BeOfType<OkObjectResult>().Subject;
        return okResult.Value.Should().BeOfType<PeopleLookupResponse>().Subject;
    }

    private static async Task<PeopleLookupResponse> Detail(PeopleLookupController controller, string id)
    {
        var actionResult = await controller.Detail(id);
        var okResult = actionResult.Result.Should().BeOfType<OkObjectResult>().Subject;
        return okResult.Value.Should().BeOfType<PeopleLookupResponse>().Subject;
    }

    private static PeopleLookupController CreateController(
        IIdentityLookupService identityLookupService,
        bool allowSensitiveInfo)
    {
        var controller = new PeopleLookupController(
            identityLookupService,
            new FakePeopleLookupPermissionService(allowSensitiveInfo));

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity([], "TestAuth")),
            },
        };

        return controller;
    }

    private static PeopleSearchResult Found(string search, string fullName, string? employeeId = null)
    {
        return new PeopleSearchResult
        {
            SearchValue = search,
            Found = true,
            FullName = fullName,
            EmployeeId = employeeId,
        };
    }

    private static PeopleSearchResult NotFound(string search)
    {
        return new PeopleSearchResult
        {
            SearchValue = search,
            Found = false,
        };
    }

    private sealed class FakeIdentityLookupService : IIdentityLookupService
    {
        public List<string> Calls { get; } = [];

        public Func<string, PeopleSearchResult> LookupHandler { get; init; } = NotFound;

        public Func<PeopleSearchField, string, PeopleSearchResult> LookupIdHandler { get; init; } = (_, search) => NotFound(search);

        public Task<PeopleSearchResult> Lookup(string search)
        {
            Calls.Add($"Lookup:{search}");
            return Task.FromResult(LookupHandler(search));
        }

        public Task<PeopleSearchResult> LookupId(PeopleSearchField searchField, string search)
        {
            Calls.Add($"LookupId:{searchField}:{search}");
            return Task.FromResult(LookupIdHandler(searchField, search));
        }

        public Task<PeopleSearchResult[]> LookupLastName(string search)
        {
            throw new NotSupportedException();
        }

        public Task<PeopleSearchResult[]> LookupPpsaCode(string search)
        {
            throw new NotSupportedException();
        }
    }

    private sealed class FakePeopleLookupPermissionService : IPeopleLookupPermissionService
    {
        private readonly bool _allowSensitiveInfo;

        public FakePeopleLookupPermissionService(bool allowSensitiveInfo)
        {
            _allowSensitiveInfo = allowSensitiveInfo;
        }

        public bool CanSeeSensitiveInfo(ClaimsPrincipal user)
        {
            return _allowSensitiveInfo;
        }
    }
}
