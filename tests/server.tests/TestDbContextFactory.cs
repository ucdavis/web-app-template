using Microsoft.EntityFrameworkCore;
using server.core.Data;

namespace Server.Tests;

public static class TestDbContextFactory
{
    /// <summary>
    /// Creates a fresh AppDbContext using EFCore InMemory with a unique database name,
    /// so each test starts clean.
    /// </summary>
    public static AppDbContext CreateInMemory()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: $"TestDb_{Guid.NewGuid():N}")
            .EnableSensitiveDataLogging()
            .Options;

        var ctx = new AppDbContext(options);
        ctx.Database.EnsureCreated();
        return ctx;
    }
}
