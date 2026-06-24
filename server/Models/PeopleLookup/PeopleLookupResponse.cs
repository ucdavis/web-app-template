namespace Server.Models.PeopleLookup;

public class PeopleLookupResponse
{
    public bool AllowSensitiveInfo { get; set; }

    public string? Message { get; set; }

    public IList<PeopleSearchResult> Results { get; set; } = new List<PeopleSearchResult>();
}
