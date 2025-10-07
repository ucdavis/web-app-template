using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using server.core.Data;
using server.core.Domain;

public interface IDbInitializer
{
    Task InitializeAsync(bool includeDevSeed, CancellationToken cancellationToken = default);
}

public class DbInitializer : IDbInitializer
{
    private readonly AppDbContext _db;
    private readonly ILogger<DbInitializer> _logger;

    public DbInitializer(AppDbContext db, ILogger<DbInitializer> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task InitializeAsync(bool includeDevSeed, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Applying database migrations...");
        await _db.Database.MigrateAsync(cancellationToken);
        _logger.LogInformation("Migrations applied.");

        if (includeDevSeed)
        {
            await SeedDevelopmentAsync(cancellationToken);
        }
        else
        {
            await SeedProductionSafeAsync(cancellationToken);
        }
    }

    private async Task SeedDevelopmentAsync(CancellationToken ct)
    {
        if (!await _db.WeatherForecasts.AnyAsync(ct))
        {
            var forecasts = new[]
            {
                new WeatherForecast { Date = DateOnly.FromDateTime(DateTime.Now.AddDays(-5)), TemperatureC = 18, Summary = "Cool" },
                new WeatherForecast { Date = DateOnly.FromDateTime(DateTime.Now.AddDays(-4)), TemperatureC = 22, Summary = "Mild" },
                new WeatherForecast { Date = DateOnly.FromDateTime(DateTime.Now.AddDays(-3)), TemperatureC = 35, Summary = "Hot" },
                new WeatherForecast { Date = DateOnly.FromDateTime(DateTime.Now.AddDays(-2)), TemperatureC = 15, Summary = "Chilly" },
                new WeatherForecast { Date = DateOnly.FromDateTime(DateTime.Now.AddDays(-1)), TemperatureC = 8, Summary = "Freezing" },
                new WeatherForecast { Date = DateOnly.FromDateTime(DateTime.Now), TemperatureC = 25, Summary = "Warm" },
                new WeatherForecast { Date = DateOnly.FromDateTime(DateTime.Now.AddDays(1)), TemperatureC = 28, Summary = "Balmy" },
                new WeatherForecast { Date = DateOnly.FromDateTime(DateTime.Now.AddDays(2)), TemperatureC = 12, Summary = "Cold" },
                new WeatherForecast { Date = DateOnly.FromDateTime(DateTime.Now.AddDays(3)), TemperatureC = 32, Summary = "Scorching" },
                new WeatherForecast { Date = DateOnly.FromDateTime(DateTime.Now.AddDays(4)), TemperatureC = 20, Summary = "Pleasant" }
            };

            _db.WeatherForecasts.AddRange(forecasts);
            await _db.SaveChangesAsync(ct);
        }
    }

    // just a placeholder for any production-safe seeding
    private Task SeedProductionSafeAsync(CancellationToken ct)
        => Task.CompletedTask;
}
