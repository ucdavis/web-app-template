using Microsoft.EntityFrameworkCore;
using server.core.Domain;

namespace server.core.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<WeatherForecast> WeatherForecasts => Set<WeatherForecast>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Configure entity properties and relationships here if needed
        base.OnModelCreating(modelBuilder);
    }
}