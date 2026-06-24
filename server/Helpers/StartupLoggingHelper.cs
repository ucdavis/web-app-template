namespace Server.Helpers;

public static class StartupLoggingHelper
{
    private const string StartupFailureMessage = "Application startup failed.";

    public static void LogStartupFailure(WebApplication? app, Exception exception)
    {
        if (app is not null)
        {
            app.Logger.LogCritical(exception, StartupFailureMessage);
            return;
        }

        using var loggerFactory = CreateFallbackLoggerFactory();
        var logger = loggerFactory.CreateLogger("Server.Startup");
        logger.LogCritical(exception, StartupFailureMessage);
    }

    private static ILoggerFactory CreateFallbackLoggerFactory()
    {
        return LoggerFactory.Create(logging =>
        {
            logging.ClearProviders();
            logging.AddJsonConsole(options =>
            {
                options.IncludeScopes = true;
                options.UseUtcTimestamp = true;
            });
        });
    }
}
