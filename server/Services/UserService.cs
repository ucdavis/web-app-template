using System.Security.Claims;

namespace Server.Services;

public interface IUserService
{
    Task<List<string>> GetRolesForUser(string userId);

    Task<ClaimsPrincipal?> UpdateUserPrincipalIfNeeded(ClaimsPrincipal principal);
}

public class UserService : IUserService
{
    private readonly ILogger<UserService> _logger;

    public UserService(ILogger<UserService> logger)
    {
        _logger = logger;
    }

    public async Task<List<string>> GetRolesForUser(string userId)
    {
        // fake role strings; replace this with a persistent role source when the app needs one
        var roles = new List<string> { "User", "SampleRole" };

        return await Task.FromResult(roles);
    }

    public async Task<ClaimsPrincipal?> UpdateUserPrincipalIfNeeded(ClaimsPrincipal principal)
    {
        // Here you could check if the user's roles or other claims have changed
        // and if so, create a new ClaimsPrincipal with updated claims.
        var userId = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null)
        {
            return null; // can't update without user ID
        }

        // get user's roles
        // might want to cache w/ IMemoryCache to avoid DB hits on every request, but we'll skip that for simplicity
        var currentRoles = await GetRolesForUser(userId);

        // compare roles to existing claims, only update if different
        var cookieRoles = principal.FindAll(ClaimTypes.Role).Select(c => c.Value).ToList();
        var changed = currentRoles.Count != cookieRoles.Count ||
                      currentRoles.Except(cookieRoles).Any();

        if (!changed) { return null; } // no change

        // create new identity with updated roles
        var newId = new ClaimsIdentity(principal.Claims, authenticationType: principal.Identity?.AuthenticationType);

        // remove old role claims
        foreach (var roleClaim in newId.FindAll(ClaimTypes.Role).ToList())
        {
            newId.RemoveClaim(roleClaim);
        }

        // add new role claims
        foreach (var role in currentRoles)
        {
            newId.AddClaim(new Claim(ClaimTypes.Role, role));
        }

        // create new principal and return it
        return new ClaimsPrincipal(newId);
    }
}
