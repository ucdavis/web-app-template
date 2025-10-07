using System;
using System.ComponentModel.DataAnnotations;

namespace server.core.Domain;

public class WeatherForecast
{
    [Key]
    public int Id { get; set; }

    [Required]
    public DateOnly Date { get; set; }

    [Required]
    [Range(-100, 100)]
    public int TemperatureC { get; set; }

    public int TemperatureF => 32 + (int)(TemperatureC / 0.5556);

    [MaxLength(100)]
    public string? Summary { get; set; }
}