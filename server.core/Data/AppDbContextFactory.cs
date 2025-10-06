using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using DotNetEnv;

namespace server.core.Data;

// this is used by EF Core tools (like migrations) to create the DbContext
// just a design time thing but i think it might be better than those bash scripts
public class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        // Load .env if present
        try { Env.Load(); } catch { /* ignore */ }

        var conn = Environment.GetEnvironmentVariable("DB_CONNECTION");
        if (string.IsNullOrWhiteSpace(conn))
            throw new InvalidOperationException("Database connection string (DB_CONNECTION) is not set.");

        var builder = new DbContextOptionsBuilder<AppDbContext>();
        builder.UseSqlServer(conn);

        return new AppDbContext(builder.Options);
    }
}