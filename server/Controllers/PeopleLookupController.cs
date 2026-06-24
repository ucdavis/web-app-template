using System.Text.RegularExpressions;
using Ietws;
using Microsoft.AspNetCore.Mvc;
using Server.Models.PeopleLookup;
using Server.Services;

namespace Server.Controllers;

public partial class PeopleLookupController : ApiControllerBase
{
    private const string SearchTypeEmail = "email";
    private const string SearchTypeEmployeeId = "employeeId";
    private const string SearchTypeIamId = "iamId";
    private const string SearchTypeKerb = "kerb";
    private const string SearchTypeLastName = "lastName";
    private const string SearchTypePpsaDeptCode = "ppsaDeptCode";
    private const string SearchTypePpsId = "ppsId";
    private const string SearchTypeStudentId = "studentId";

    private readonly IIdentityLookupService _identityLookupService;
    private readonly IPeopleLookupPermissionService _permissionService;

    public PeopleLookupController(
        IIdentityLookupService identityLookupService,
        IPeopleLookupPermissionService permissionService)
    {
        _identityLookupService = identityLookupService;
        _permissionService = permissionService;
    }

    [HttpGet("options")]
    public ActionResult<PeopleLookupResponse> Options()
    {
        return Ok(new PeopleLookupResponse
        {
            AllowSensitiveInfo = _permissionService.CanSeeSensitiveInfo(User)
        });
    }

    [HttpPost("search")]
    public async Task<ActionResult<PeopleLookupResponse>> Search(BulkPeopleLookupRequest request)
    {
        var allowSensitiveInfo = _permissionService.CanSeeSensitiveInfo(User);
        var response = new PeopleLookupResponse
        {
            AllowSensitiveInfo = allowSensitiveInfo
        };
        var searchText = request.SearchText?.Trim();
        var searchType = NormalizeSearchType(request.SearchType);

        if (string.IsNullOrWhiteSpace(searchText))
        {
            response.Message = "You must enter at least one search value.";
            return Ok(response);
        }

        if (string.IsNullOrWhiteSpace(searchType))
        {
            response.Message = "Select a valid search type.";
            return Ok(response);
        }

        if (IsSensitiveSearchType(searchType) && !allowSensitiveInfo)
        {
            response.Message = "Sensitive identifier searches were ignored for your account.";
            return Ok(response);
        }

        switch (searchType)
        {
            case SearchTypeEmail:
                await AddLookupMatches(
                    searchText,
                    EmailRegex(),
                    value => _identityLookupService.Lookup(value),
                    allowSensitiveInfo,
                    response.Results);
                break;
            case SearchTypeKerb:
                await AddLookupMatches(
                    searchText,
                    KerbRegex(),
                    value => _identityLookupService.Lookup(value),
                    allowSensitiveInfo,
                    response.Results);
                break;
            case SearchTypeIamId:
                await AddLookupMatches(
                    searchText,
                    NumericIdRegex(),
                    value => _identityLookupService.LookupId(PeopleSearchField.iamId, value),
                    allowSensitiveInfo,
                    response.Results);
                break;
            case SearchTypeLastName:
                await AddLookupMatches(
                    searchText,
                    LastNameRegex(),
                    value => _identityLookupService.LookupLastName(value),
                    allowSensitiveInfo,
                    response.Results);
                break;
            case SearchTypePpsaDeptCode:
                await AddLookupMatches(
                    searchText,
                    PpsaDeptCodeRegex(),
                    value => _identityLookupService.LookupPpsaCode(value),
                    allowSensitiveInfo,
                    response.Results);
                break;
            case SearchTypeEmployeeId:
                await AddLookupMatches(
                    searchText,
                    NumericIdRegex(),
                    value => _identityLookupService.LookupId(PeopleSearchField.employeeId, value),
                    allowSensitiveInfo,
                    response.Results);
                break;
            case SearchTypeStudentId:
                await AddLookupMatches(
                    searchText,
                    NumericIdRegex(),
                    value => _identityLookupService.LookupId(PeopleSearchField.studentId, value),
                    allowSensitiveInfo,
                    response.Results);
                break;
            case SearchTypePpsId:
                await AddLookupMatches(
                    searchText,
                    NumericIdRegex(),
                    value => _identityLookupService.LookupId(PeopleSearchField.ppsId, value),
                    allowSensitiveInfo,
                    response.Results);
                break;
        }

        if (response.Results.Count == 0)
        {
            response.Message = "No results found.";
        }

        return Ok(response);
    }

    [HttpGet("detail/{id}")]
    public async Task<ActionResult<PeopleLookupResponse>> Detail(string id)
    {
        var allowSensitiveInfo = _permissionService.CanSeeSensitiveInfo(User);
        var response = new PeopleLookupResponse
        {
            AllowSensitiveInfo = allowSensitiveInfo
        };

        if (string.IsNullOrWhiteSpace(id))
        {
            response.Results.Add(new PeopleSearchResult
            {
                ErrorMessage = "No parameter passed"
            });
            return Ok(response);
        }

        var result = await LookupDetail(id, allowSensitiveInfo);

        if (!allowSensitiveInfo)
        {
            result.HideSensitiveFields();
        }

        response.Results.Add(result);
        return Ok(response);
    }

    private async Task<PeopleSearchResult> LookupDetail(string rawSearch, bool allowSensitiveInfo)
    {
        var search = rawSearch.Trim();

        if (allowSensitiveInfo && search.Contains("@health.", StringComparison.OrdinalIgnoreCase))
        {
            search = search.Replace("@health.", "@", StringComparison.OrdinalIgnoreCase);
        }

        PeopleSearchResult? result = null;
        var email = GetEmail(search);

        if (!string.IsNullOrWhiteSpace(email))
        {
            result = await _identityLookupService.Lookup(email);

            if (result.Found)
            {
                return result;
            }
        }

        var kerb = GetKerb(search, email);

        if (!string.IsNullOrWhiteSpace(kerb))
        {
            result = await _identityLookupService.Lookup(kerb);

            if (result.Found)
            {
                return result;
            }
        }

        var numericId = GetNumericId(search);

        if (string.IsNullOrWhiteSpace(numericId))
        {
            return result ?? new PeopleSearchResult { SearchValue = search };
        }

        result = await _identityLookupService.LookupId(PeopleSearchField.iamId, numericId);

        if (result.Found || !allowSensitiveInfo)
        {
            return result;
        }

        result = await _identityLookupService.LookupId(PeopleSearchField.employeeId, numericId);

        if (result.Found)
        {
            return result;
        }

        result = await _identityLookupService.LookupId(PeopleSearchField.studentId, numericId);

        if (result.Found)
        {
            return result;
        }

        return await _identityLookupService.LookupId(PeopleSearchField.ppsId, numericId);
    }

    private static async Task AddLookupMatches(
        string? rawSearch,
        Regex regex,
        Func<string, Task<PeopleSearchResult>> lookup,
        bool allowSensitiveInfo,
        IList<PeopleSearchResult> results)
    {
        if (string.IsNullOrWhiteSpace(rawSearch))
        {
            return;
        }

        var lookupTasks = regex.Matches(rawSearch)
            .Select(match => lookup(match.Value))
            .ToArray();

        AddResults(await Task.WhenAll(lookupTasks), allowSensitiveInfo, results);
    }

    private static async Task AddLookupMatches(
        string? rawSearch,
        Regex regex,
        Func<string, Task<PeopleSearchResult[]>> lookup,
        bool allowSensitiveInfo,
        IList<PeopleSearchResult> results)
    {
        if (string.IsNullOrWhiteSpace(rawSearch))
        {
            return;
        }

        var lookupTasks = regex.Matches(rawSearch)
            .Select(match => lookup(match.Value))
            .ToArray();
        var groupedResults = await Task.WhenAll(lookupTasks);

        foreach (var resultGroup in groupedResults)
        {
            AddResults(resultGroup, allowSensitiveInfo, results);
        }
    }

    private static void AddResults(
        IEnumerable<PeopleSearchResult> lookupResults,
        bool allowSensitiveInfo,
        IList<PeopleSearchResult> results)
    {
        foreach (var result in lookupResults)
        {
            if (!allowSensitiveInfo)
            {
                result.HideSensitiveFields();
            }

            results.Add(result);
        }
    }

    private static string? NormalizeSearchType(string? searchType)
    {
        if (string.IsNullOrWhiteSpace(searchType))
        {
            return null;
        }

        var normalizedSearchType = searchType.Trim();

        if (string.Equals(normalizedSearchType, SearchTypeEmail, StringComparison.OrdinalIgnoreCase))
        {
            return SearchTypeEmail;
        }

        if (string.Equals(normalizedSearchType, SearchTypeEmployeeId, StringComparison.OrdinalIgnoreCase))
        {
            return SearchTypeEmployeeId;
        }

        if (string.Equals(normalizedSearchType, SearchTypeIamId, StringComparison.OrdinalIgnoreCase))
        {
            return SearchTypeIamId;
        }

        if (string.Equals(normalizedSearchType, SearchTypeKerb, StringComparison.OrdinalIgnoreCase))
        {
            return SearchTypeKerb;
        }

        if (string.Equals(normalizedSearchType, SearchTypeLastName, StringComparison.OrdinalIgnoreCase))
        {
            return SearchTypeLastName;
        }

        if (string.Equals(normalizedSearchType, SearchTypePpsaDeptCode, StringComparison.OrdinalIgnoreCase))
        {
            return SearchTypePpsaDeptCode;
        }

        if (string.Equals(normalizedSearchType, SearchTypePpsId, StringComparison.OrdinalIgnoreCase))
        {
            return SearchTypePpsId;
        }

        if (string.Equals(normalizedSearchType, SearchTypeStudentId, StringComparison.OrdinalIgnoreCase))
        {
            return SearchTypeStudentId;
        }

        return null;
    }

    private static bool IsSensitiveSearchType(string searchType)
    {
        return string.Equals(searchType, SearchTypeEmployeeId, StringComparison.OrdinalIgnoreCase)
               || string.Equals(searchType, SearchTypePpsId, StringComparison.OrdinalIgnoreCase)
               || string.Equals(searchType, SearchTypeStudentId, StringComparison.OrdinalIgnoreCase);
    }

    private static string? GetEmail(string search)
    {
        if (!search.Contains('@', StringComparison.Ordinal))
        {
            return null;
        }

        var match = EmailRegex().Match(search);
        return match.Success ? match.Value : null;
    }

    private static string GetKerb(string search, string? email)
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            return search;
        }

        var atIndex = email.IndexOf('@', StringComparison.Ordinal);
        return atIndex > 0 ? email[..atIndex] : search;
    }

    private static string? GetNumericId(string search)
    {
        var match = NumericIdRegex().Match(search);
        return match.Success ? match.Value : null;
    }

    [GeneratedRegex(@"\b[A-Z0-9._-]+@[A-Z0-9][A-Z0-9.-]{0,61}[A-Z0-9]\.[A-Z.]{2,6}\b", RegexOptions.IgnoreCase)]
    private static partial Regex EmailRegex();

    [GeneratedRegex(@"\b[A-Z0-9]{2,10}\b", RegexOptions.IgnoreCase)]
    private static partial Regex KerbRegex();

    [GeneratedRegex(@"\b[A-Z0-9-]{2,20}\b", RegexOptions.IgnoreCase)]
    private static partial Regex PpsaDeptCodeRegex();

    [GeneratedRegex(@"\b[0-9]{2,10}\b", RegexOptions.IgnoreCase)]
    private static partial Regex NumericIdRegex();

    [GeneratedRegex(@"\b[A-Z0-9\-]{2,50}\b", RegexOptions.IgnoreCase)]
    private static partial Regex LastNameRegex();
}
