namespace Server.Models.PeopleLookup;

public class PeopleLookupOptions
{
    public const string SectionName = "PeopleLookup";

    public string IamKey { get; set; } = string.Empty;

    public string SensitiveInfoUsers { get; set; } = string.Empty;
}
