namespace Server.Examples.Notifications;

public static class NotificationExampleServiceCollectionExtensions
{
    public static IServiceCollection AddNotificationExamples(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddOptions<SampleNotificationOptions>()
            .Bind(configuration.GetSection(SampleNotificationOptions.SectionName));
        services.AddScoped<ISampleNotificationService, SampleNotificationService>();
        return services;
    }
}
