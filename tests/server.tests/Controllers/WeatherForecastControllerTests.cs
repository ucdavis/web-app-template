using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Server.Controllers;
using server.core.Data;
using server.core.Domain;
using Server.Tests;

namespace server.tests.Controllers;

public class WeatherForecastControllerTests
{
    [Fact]
    public async Task Get_returns_latest_20_forecasts_descending_by_date()
    {
        // Arrange
        using AppDbContext ctx = TestDbContextFactory.CreateInMemory();

        // seed some data
        var today = DateOnly.FromDateTime(DateTime.Today);

        for (int i = 0; i < 25; i++)
        {
            ctx.WeatherForecasts.Add(new WeatherForecast
            {
                Date = today.AddDays(i),          // strictly increasing dates
                TemperatureC = i % 50 - 10,       // some variety
                Summary = $"Day {i}"
            });
        }

        ctx.SaveChanges();

        var logger = NullLogger<WeatherForecastController>.Instance;
        var controller = new WeatherForecastController(logger, ctx);

        // Act
        var result = await controller.Get();
        var list = result.ToList();

        // Assert
        list.Should().HaveCount(20, "controller takes top 20");

        // dates should be strictly descending, starting from the most recent
        var dates = list.Select(w => w.Date).ToList();
        dates.Should().BeInDescendingOrder();

        // The first item should be the last inserted date (today + 24)
        var expectedTop = DateOnly.FromDateTime(DateTime.Today).AddDays(24);
        dates.First().Should().Be(expectedTop);

        // The last of the 20 should be (today + 5)
        var expectedLast = DateOnly.FromDateTime(DateTime.Today).AddDays(5);
        dates.Last().Should().Be(expectedLast);

        // also sanity-check a couple of mapped properties carried through
        list[0].Summary.Should().Be("Day 24");
        list[0].TemperatureC.Should().Be(24 % 50 - 10);
    }
}
