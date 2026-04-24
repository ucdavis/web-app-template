using Mjml.Net;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Razor.Templating.Core;

namespace Server.Core.Notification;

public static class NotificationServiceCollectionExtensions
{
    public static IServiceCollection AddNotificationServices(this IServiceCollection services, IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentNullException.ThrowIfNull(configuration);

        services.AddSingleton<IValidateOptions<SmtpOptions>, SmtpOptionsValidator>();
        services.AddOptions<SmtpOptions>()
            .Bind(configuration.GetSection(SmtpOptions.SectionName))
            .ValidateOnStart();
        services.AddOptions<NotificationOptions>()
            .Bind(configuration.GetSection(NotificationOptions.SectionName));

        services.AddSingleton<MjmlRenderer>();
        services.AddScoped<IEmailService, EmailService>();
        services.AddScoped<INotificationRenderer, RazorMjmlNotificationRenderer>();
        services.AddScoped<INotificationService, NotificationService>();
        services.AddRazorTemplating();

        return services;
    }
}
