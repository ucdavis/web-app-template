using Ietws;
using Microsoft.Extensions.Options;
using Server.Models.PeopleLookup;

namespace Server.Services;

public interface IIdentityLookupService
{
    Task<PeopleSearchResult> Lookup(string search);

    Task<PeopleSearchResult> LookupId(PeopleSearchField searchField, string search);

    Task<PeopleSearchResult[]> LookupLastName(string search);

    Task<PeopleSearchResult[]> LookupPpsaCode(string search);
}

public class IdentityLookupService : IIdentityLookupService
{
    private readonly IetClient _clientws;

    public IdentityLookupService(IOptions<PeopleLookupOptions> options, IHttpClientFactory httpClientFactory)
    {
        var iamKey = options.Value.IamKey;

        if (string.IsNullOrWhiteSpace(iamKey))
        {
            throw new InvalidOperationException(
                "People lookup is not configured. Set PeopleLookup__IamKey in .env or environment variables.");
        }

        var httpClient = httpClientFactory.CreateClient("identity");
        _clientws = new IetClient(httpClient, iamKey);
    }

    public async Task<PeopleSearchResult> Lookup(string search)
    {
        var searchResult = new PeopleSearchResult();

        try
        {
            searchResult = search.Contains('@', StringComparison.Ordinal)
                ? await LookupEmail(search)
                : await LookupKerb(search);

            if (searchResult.Found && !string.IsNullOrWhiteSpace(searchResult.IamId))
            {
                await LookupAssociations(searchResult.IamId, searchResult);
                await LookupEmployeeId(searchResult.IamId, searchResult);
            }
        }
        catch (Exception e)
        {
            searchResult.SearchValue = search;
            searchResult.ErrorMessage = "Error Occurred";
            searchResult.ExceptionMessage = $"(Lookup) Error: {e.Message} Inner: {e.InnerException?.Message} {e}";
        }

        return searchResult;
    }

    public async Task<PeopleSearchResult[]> LookupLastName(string search)
    {
        var results = new List<PeopleSearchResult>();

        try
        {
            var peopleResult = await _clientws.People.Search(PeopleSearchField.oLastName, search);
            var iamIds = peopleResult.ResponseData.Results.Select(a => a.IamId).Distinct().ToArray();
            var lookupTasks = iamIds.Select(a => LookupId(PeopleSearchField.iamId, a)).ToArray();
            var lookupResults = await Task.WhenAll(lookupTasks);

            if (lookupResults.Length == 0)
            {
                results.Add(new PeopleSearchResult
                {
                    SearchValue = search,
                    Found = false
                });
            }

            foreach (var result in lookupResults)
            {
                result.SearchValue = search;
                results.Add(result);
            }
        }
        catch (Exception e)
        {
            results.Add(new PeopleSearchResult
            {
                SearchValue = search,
                ErrorMessage = "Error Occurred",
                ExceptionMessage = $"(LookupLastName) Error: {e.Message} Inner: {e.InnerException?.Message} {e}"
            });
        }

        return results.ToArray();
    }

    public async Task<PeopleSearchResult[]> LookupPpsaCode(string search)
    {
        var results = new List<PeopleSearchResult>();

        try
        {
            var ppsaResults = await _clientws.PPSAssociations.GetIamIds(PPSAssociationsSearchField.adminDeptCode, search);
            var iamIds = ppsaResults.ResponseData.Results.Select(a => a.IamId).ToArray();
            var lookupTasks = iamIds.Select(a => LookupId(PeopleSearchField.iamId, a)).ToArray();
            var lookupResults = await Task.WhenAll(lookupTasks);

            if (lookupResults.Length == 0)
            {
                results.Add(new PeopleSearchResult
                {
                    SearchValue = search,
                    Found = false
                });
            }

            foreach (var result in lookupResults)
            {
                result.SearchValue = search;
                results.Add(result);
            }
        }
        catch (Exception e)
        {
            results.Add(new PeopleSearchResult
            {
                SearchValue = search,
                ErrorMessage = "Error Occurred",
                ExceptionMessage = $"(Lookup PPSA Code) Error: {e.Message} Inner: {e.InnerException?.Message} {e}"
            });
        }

        return results.ToArray();
    }

    public async Task<PeopleSearchResult> LookupId(PeopleSearchField searchField, string search)
    {
        var searchResult = new PeopleSearchResult
        {
            SearchValue = search
        };

        try
        {
            var peopleResult = await _clientws.People.Search(searchField, search);
            var personResult = peopleResult.ResponseData.Results.FirstOrDefault();

            if (personResult == null || string.IsNullOrWhiteSpace(personResult.IamId))
            {
                return searchResult;
            }

            var iamId = personResult.IamId;
            var contactResult = await _clientws.Contacts.Get(iamId);

            if (contactResult.ResponseData.Results.Length == 0)
            {
                var kerbResult = await _clientws.Kerberos.Search(KerberosSearchField.iamId, iamId);

                if (kerbResult.ResponseData.Results.Length > 0)
                {
                    var kerbPerson = kerbResult.ResponseData.Results.First();
                    kerbPerson.EmployeeId = personResult.EmployeeId;
                    await PopulateSearchResult(searchResult, kerbPerson, contactResult, personResult);
                }
                else
                {
                    await PopulatePartialSearchResult(searchResult, personResult, contactResult);
                }

                searchResult.ErrorMessage = "No Contact details";
                return searchResult;
            }

            var result = await _clientws.Kerberos.Search(KerberosSearchField.iamId, iamId);
            if (result.ResponseData.Results.Length > 0)
            {
                var kerbPerson = result.ResponseData.Results.First();
                kerbPerson.EmployeeId = personResult.EmployeeId;
                await PopulateSearchResult(searchResult, kerbPerson, contactResult, personResult);
            }
            else
            {
                await PopulatePartialSearchResult(searchResult, personResult, contactResult);
                searchResult.ErrorMessage = "Kerb Not Found";
            }

            if (searchResult.Found && !string.IsNullOrWhiteSpace(searchResult.IamId))
            {
                await LookupAssociations(searchResult.IamId, searchResult);
                await LookupEmployeeId(searchResult.IamId, searchResult);
            }
        }
        catch (Exception e)
        {
            searchResult.ErrorMessage = "Error Occurred";
            searchResult.ExceptionMessage = $"(LookupId) Error: {e.Message} Inner: {e.InnerException?.Message} {e}";
        }

        return searchResult;
    }

    private async Task LookupAssociations(string iamId, PeopleSearchResult searchResult)
    {
        var result = await _clientws.PPSAssociations.Search(PPSAssociationsSearchField.iamId, iamId);

        if (result.ResponseData.Results.Length == 0)
        {
            return;
        }

        var depts = new List<string>();
        var deptCodes = new List<string>();

        foreach (var ppsAssociationsResult in result.ResponseData.Results)
        {
            depts.Add(ppsAssociationsResult.apptDeptDisplayName);
            deptCodes.Add(ppsAssociationsResult.apptDeptCode);
        }

        searchResult.Departments = $"{string.Join(", ", depts.Distinct())} ({string.Join(", ", deptCodes.Distinct())})";
        searchResult.Title = string.Empty;

        if (result.ResponseData.Results.Any(a => a.titleOfficialName != null))
        {
            searchResult.Title = string.Join(
                ", ",
                result.ResponseData.Results
                    .Where(a => a.titleOfficialName != null)
                    .Select(a => a.titleOfficialName)
                    .Distinct()
                    .ToArray());
        }

        searchResult.ReportsToIamId = result.ResponseData.Results
            .FirstOrDefault(a => !string.IsNullOrWhiteSpace(a.reportsToIAMID))
            ?.reportsToIAMID;
    }

    private async Task LookupEmployeeId(string iamId, PeopleSearchResult searchResult)
    {
        if (!string.IsNullOrWhiteSpace(searchResult.EmployeeId))
        {
            return;
        }

        var peopleResult = await _clientws.People.Get(iamId);
        var personResult = peopleResult.ResponseData.Results.FirstOrDefault();

        if (personResult != null)
        {
            searchResult.EmployeeId = personResult.EmployeeId;
        }
    }

    private async Task<PeopleSearchResult> LookupEmail(string email)
    {
        var searchResult = new PeopleSearchResult
        {
            SearchValue = email
        };

        var iamResult = await _clientws.Contacts.Search(ContactSearchField.email, email);
        var iamId = iamResult.ResponseData.Results.Length > 0
            ? iamResult.ResponseData.Results[0].IamId
            : string.Empty;

        if (string.IsNullOrWhiteSpace(iamId))
        {
            return searchResult;
        }

        var kerbResult = await _clientws.Kerberos.Search(KerberosSearchField.iamId, iamId);
        if (kerbResult.ResponseData.Results.Length == 0)
        {
            return searchResult;
        }

        var personResults = await _clientws.People.Get(iamId);
        var personResult = personResults.ResponseData.Results.FirstOrDefault();

        if (personResult == null)
        {
            return searchResult;
        }

        await PopulateSearchResult(searchResult, kerbResult.ResponseData.Results.First(), iamResult, personResult);
        return searchResult;
    }

    private async Task<PeopleSearchResult> LookupKerb(string kerb)
    {
        var searchResult = new PeopleSearchResult
        {
            SearchValue = kerb
        };

        var kerbResult = await _clientws.Kerberos.Search(KerberosSearchField.userId, kerb);

        if (kerbResult.ResponseData.Results.Length == 0)
        {
            return searchResult;
        }

        if (kerbResult.ResponseData.Results.Length != 1)
        {
            var iamIds = kerbResult.ResponseData.Results.Select(a => a.IamId).Distinct().ToArray();
            var userIds = kerbResult.ResponseData.Results.Select(a => a.UserId).Distinct().ToArray();

            if (iamIds.Length != 1 && userIds.Length != 1)
            {
                searchResult.ErrorMessage =
                    $"IAM issue with non unique values for kerbs: {string.Join(',', userIds)} IAM: {string.Join(',', iamIds)}";
                return searchResult;
            }
        }

        var kerbPerson = kerbResult.ResponseData.Results.First();
        var personResults = await _clientws.People.Get(kerbPerson.IamId);
        var uniquePersonResultCount = personResults.ResponseData.Results
            .Select(person => System.Text.Json.JsonSerializer.Serialize(person))
            .Distinct()
            .ToArray()
            .Length;

        if (uniquePersonResultCount != 1)
        {
            searchResult.ErrorMessage = $"IAM issue with non unique values for IAM Id: {kerbPerson.IamId}";
            return searchResult;
        }

        var contactResult = await _clientws.Contacts.Get(kerbPerson.IamId);
        await PopulateSearchResult(searchResult, kerbPerson, contactResult, personResults.ResponseData.Results.First());

        if (contactResult.ResponseData.Results.Length == 0)
        {
            searchResult.ErrorMessage = "Contact Info not found.";
        }

        return searchResult;
    }

    private async Task PopulateSearchResult(
        PeopleSearchResult searchResult,
        KerberosResult kerbResult,
        ContactResults contactResults,
        PeopleResult personResult)
    {
        var contact = contactResults.ResponseData.Results.FirstOrDefault();
        var emails = GetEmails(personResult.CampusEmail, contactResults, contact?.Email);

        if (!string.IsNullOrWhiteSpace(kerbResult.IamId))
        {
            await AddHealthEmails(kerbResult.IamId, emails);
        }

        searchResult.Found = true;
        searchResult.KerbId = kerbResult.UserId;
        searchResult.IamId = kerbResult.IamId;
        searchResult.Email = contact?.Email;
        searchResult.OtherEmails = emails.Count > 0 ? string.Join("; ", emails) : null;
        searchResult.WorkPhone = contact?.WorkPhone;
        searchResult.FullName = kerbResult.FullName;
        searchResult.OfficialFullName = kerbResult.OFullName;
        searchResult.FirstName = kerbResult.FirstName;
        searchResult.LastName = kerbResult.LastName;
        searchResult.Pronouns = kerbResult.DPronouns;
        searchResult.IsEmployee = kerbResult.IsEmployee;
        searchResult.IsFaculty = kerbResult.IsFaculty;
        searchResult.IsStudent = kerbResult.IsStudent;
        searchResult.IsHsEmployee = kerbResult.IsHSEmployee;
        searchResult.IsExternal = kerbResult.IsExternal;
        searchResult.IsStaff = kerbResult.IsStaff;
        searchResult.PpsId = kerbResult.PpsId;
        searchResult.StudentId = kerbResult.StudentId;
        searchResult.BannerPidm = kerbResult.BannerPidm;
        searchResult.EmployeeId = kerbResult.EmployeeId;
        searchResult.MothraId = kerbResult.MothraId;
    }

    private async Task PopulatePartialSearchResult(
        PeopleSearchResult searchResult,
        PeopleResult personResult,
        ContactResults contactResults)
    {
        var contact = contactResults.ResponseData.Results.FirstOrDefault();
        var emails = GetEmails(personResult.CampusEmail, contactResults, contact?.Email);

        if (!string.IsNullOrWhiteSpace(personResult.IamId))
        {
            await AddHealthEmails(personResult.IamId, emails);
        }

        searchResult.Found = true;
        searchResult.KerbId = null;
        searchResult.IamId = personResult.IamId;
        searchResult.Email = contact?.Email;
        searchResult.OtherEmails = emails.Count > 0 ? string.Join("; ", emails) : null;
        searchResult.WorkPhone = contact?.WorkPhone;
        searchResult.FullName = personResult.FullName;
        searchResult.OfficialFullName = personResult.OFullName;
        searchResult.FirstName = personResult.FirstName;
        searchResult.Pronouns = personResult.DPronouns;
        searchResult.LastName = personResult.LastName;
        searchResult.IsEmployee = personResult.IsEmployee;
        searchResult.IsFaculty = personResult.IsFaculty;
        searchResult.IsStudent = personResult.IsStudent;
        searchResult.IsHsEmployee = personResult.IsHSEmployee;
        searchResult.IsExternal = personResult.IsExternal;
        searchResult.IsStaff = personResult.IsStaff;
        searchResult.PpsId = personResult.PpsId;
        searchResult.StudentId = personResult.StudentId;
        searchResult.BannerPidm = personResult.BannerPidm;
        searchResult.EmployeeId = personResult.EmployeeId;
        searchResult.MothraId = personResult.MothraId;
    }

    private static List<string> GetEmails(string? campusEmail, ContactResults contactResults, string? primaryEmail)
    {
        var emails = new List<string>();

        AddEmail(emails, campusEmail);

        foreach (var contactItem in contactResults.ResponseData.Results)
        {
            AddEmail(emails, contactItem.Email);
            AddEmail(emails, contactItem.HsEmail);
        }

        if (!string.IsNullOrWhiteSpace(primaryEmail))
        {
            emails.Remove(primaryEmail.ToLowerInvariant());
        }

        return emails;
    }

    private async Task AddHealthEmails(string iamId, List<string> emails)
    {
        var healthResult = await _clientws.HsData.Search(HsDataSearchField.iamId, iamId);

        if (healthResult == null)
        {
            return;
        }

        foreach (var healthItem in healthResult.ResponseData.Results)
        {
            AddEmail(emails, healthItem.HealthEmail);
        }
    }

    private static void AddEmail(List<string> emails, string? email)
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            return;
        }

        var normalizedEmail = email.ToLowerInvariant();

        if (!emails.Contains(normalizedEmail))
        {
            emails.Add(normalizedEmail);
        }
    }
}
