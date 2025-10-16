using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using server.core.Data;
using server.core.Domain;

namespace Server.Controllers
{
    [Authorize(Roles = "SampleRole")]
    public class WeatherForecastController : ApiControllerBase
    {
        private readonly ILogger<WeatherForecastController> _logger;
        private readonly AppDbContext _context;

        public WeatherForecastController(ILogger<WeatherForecastController> logger, AppDbContext context)
        {
            _logger = logger;
            _context = context;
        }

        public async Task<IEnumerable<WeatherForecast>> Get()
        {
            var dbWeatherForecasts = await _context.WeatherForecasts
                .OrderByDescending(w => w.Date)
                .Take(20)
                .ToListAsync();

            return dbWeatherForecasts.Select(w => new WeatherForecast
            {
                Date = w.Date,
                TemperatureC = w.TemperatureC,
                Summary = w.Summary
            });
        }
    }
}
