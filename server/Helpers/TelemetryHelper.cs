using OpenTelemetry.Logs;
using OpenTelemetry.Metrics;
using OpenTelemetry.Trace;

namespace server.Helpers;

public static class TelemetryHelper
{
    /// <summary>
    /// Configures OpenTelemetry logging with JSON console output and OTLP exporter
    /// </summary>
    public static void ConfigureLogging(ILoggingBuilder logging)
    {
        logging.ClearProviders();
        logging.AddJsonConsole(options =>
        {
            options.IncludeScopes = true;
            options.UseUtcTimestamp = true;
        });

        logging.AddOpenTelemetry(logOptions =>
        {
            logOptions.IncludeFormattedMessage = true; // keep original message
            logOptions.IncludeScopes = true;           // carry our scope props
            logOptions.ParseStateValues = true;        // structured state
            logOptions.AddOtlpExporter(); // read env vars for endpoint
        });
    }

    /// <summary>
    /// Configures OpenTelemetry tracing and metrics with ASP.NET Core and HTTP client instrumentation
    /// </summary>
    public static void ConfigureOpenTelemetry(IServiceCollection services)
    {
        services.AddOpenTelemetry()
            .WithTracing(t => t
                    .SetSampler(new TraceIdRatioBasedSampler(0.2))
                    .AddAspNetCoreInstrumentation()
                    .AddHttpClientInstrumentation()
                    .AddOtlpExporter()
            )
            .WithMetrics(m => m
                    .AddAspNetCoreInstrumentation()
                    .AddHttpClientInstrumentation()
                    .AddOtlpExporter()
            );
    }
}