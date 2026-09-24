using System.Security.Claims;
using Server.Core.Data;

namespace Server.Services;

public interface IUserService
{
    Task<ClaimsPrincipal?> UpdateUserPrincipalIfNeeded(ClaimsPrincipal principal);
}

public class UserService : IUserService
{
    private readonly ILogger<UserService> _logger;
    private readonly AppDbContext _dbContext;

    public UserService(ILogger<UserService> logger, AppDbContext dbContext)
    {
        _logger = logger;
        _dbContext = dbContext;
    }

    private async Task<List<string>> GetRolesForUser(string userId)
    {
        // fake role strings but use _dbContext to get real roles later
        var roles = new List<string> { "User", "SampleRole" };

        return await Task.FromResult(roles);
    }

    public async Task<ClaimsPrincipal?> UpdateUserPrincipalIfNeeded(ClaimsPrincipal principal)
    {
        // Application roles are authoritative for both sign-in and cookie validation.
        var userId = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return null; // can't update without user ID
        }

        // get user's roles
        // might want to cache w/ IMemoryCache to avoid DB hits on every request, but we'll skip that for simplicity
        var currentRoles = await GetRolesForUser(userId);

        // compare roles to existing claims, only update if different
        var existingRoles = principal.Identities
            .SelectMany(identity => identity.FindAll(identity.RoleClaimType))
            .Select(claim => claim.Value)
            .ToList();
        var changed = currentRoles.Count != existingRoles.Count ||
                      currentRoles.Except(existingRoles).Any();

        if (!changed) { return null; } // no change

        // Clone each identity to preserve claim mappings and metadata without changing the input.
        var updatedPrincipal = new ClaimsPrincipal(principal.Identities.Select(identity => identity.Clone()));

        foreach (var identity in updatedPrincipal.Identities)
        {
            foreach (var roleClaim in identity.FindAll(identity.RoleClaimType).ToList())
            {
                identity.RemoveClaim(roleClaim);
            }
        }

        var primaryIdentity = (ClaimsIdentity)updatedPrincipal.Identity!;
        foreach (var role in currentRoles)
        {
            primaryIdentity.AddClaim(new Claim(primaryIdentity.RoleClaimType, role));
        }

        return updatedPrincipal;
    }
}
