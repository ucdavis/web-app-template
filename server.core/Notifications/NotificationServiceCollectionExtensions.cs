using Mjml.Net;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Razor.Templating.Core;

namespace server.core.Notifications;

public static class NotificationServiceCollectionExtensions
{
    public static IServiceCollection AddEmailNotifications(this IServiceCollection services, IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentNullException.ThrowIfNull(configuration);

        services.AddSingleton<IValidateOptions<EmailOptions>, EmailOptionsValidator>();
        services.AddOptions<EmailOptions>()
            .Bind(configuration)
            .ValidateOnStart();

        services.AddSingleton<MjmlRenderer>();
        services.AddScoped<IEmailService, EmailService>();
        services.AddScoped<INotificationRenderer, RazorMjmlNotificationRenderer>();
        services.AddScoped<INotificationService, NotificationService>();
        services.AddRazorTemplating();

        return services;
    }
}
