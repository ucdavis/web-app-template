using System.Security.Claims;
using Microsoft.Extensions.Options;
using Server.Models.PeopleLookup;

namespace Server.Services;

public interface IPeopleLookupPermissionService
{
    bool CanSeeSensitiveInfo(ClaimsPrincipal user);
}

public class PeopleLookupPermissionService : IPeopleLookupPermissionService
{
    private readonly PeopleLookupOptions _options;

    public PeopleLookupPermissionService(IOptions<PeopleLookupOptions> options)
    {
        _options = options.Value;
    }

    public bool CanSeeSensitiveInfo(ClaimsPrincipal user)
    {
        var allowedUsers = _options.SensitiveInfoUsers
            .Split([',', ';', '\n', '\r'], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        if (allowedUsers.Count == 0)
        {
            return false;
        }

        var possibleIdentifiers = GetPossibleUserIdentifiers(user);

        return possibleIdentifiers.Any(identifier => allowedUsers.Contains(identifier));
    }

    private static HashSet<string> GetPossibleUserIdentifiers(ClaimsPrincipal user)
    {
        var identifiers = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        AddIdentifier(identifiers, user.Identity?.Name);
        AddIdentifier(identifiers, user.FindFirst("name")?.Value);
        AddIdentifier(identifiers, user.FindFirst("preferred_username")?.Value);
        AddIdentifier(identifiers, user.FindFirst("upn")?.Value);
        AddIdentifier(identifiers, user.FindFirst("unique_name")?.Value);
        AddIdentifier(identifiers, user.FindFirst(ClaimTypes.Email)?.Value);
        AddIdentifier(identifiers, user.FindFirst(ClaimTypes.Upn)?.Value);
        AddIdentifier(identifiers, user.FindFirst(ClaimTypes.NameIdentifier)?.Value);

        return identifiers;
    }

    private static void AddIdentifier(HashSet<string> identifiers, string? identifier)
    {
        if (string.IsNullOrWhiteSpace(identifier))
        {
            return;
        }

        identifiers.Add(identifier);

        var atIndex = identifier.IndexOf('@', StringComparison.Ordinal);
        if (atIndex > 0)
        {
            identifiers.Add(identifier[..atIndex]);
        }
    }
}