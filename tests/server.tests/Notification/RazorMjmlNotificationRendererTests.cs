using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using server.core.Notification;

namespace server.tests.Notification;

public class RazorMjmlNotificationRendererTests
{
    [Fact]
    public async Task RenderAsync_renders_html_from_a_server_core_template()
    {
        var services = new ServiceCollection();
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                [$"{SmtpOptions.SectionName}:Host"] = "sandbox.smtp.mailtrap.io",
                [$"{SmtpOptions.SectionName}:Port"] = "587",
                [$"{SmtpOptions.SectionName}:Username"] = "smtp-user",
                [$"{SmtpOptions.SectionName}:Password"] = "smtp-password",
                [$"{SmtpOptions.SectionName}:FromEmail"] = "no-reply@example.test",
                [$"{SmtpOptions.SectionName}:FromName"] = "Template App",
            })
            .Build();

        services.AddLogging();
        services.AddNotificationServices(configuration);

        using var serviceProvider = services.BuildServiceProvider();
        using var scope = serviceProvider.CreateScope();

        var renderer = scope.ServiceProvider.GetRequiredService<INotificationRenderer>();

        var html = await renderer.RenderAsync("/Views/Emails/DefaultNotification_mjml.cshtml", new DefaultNotificationTemplateModel
        {
            AppName = "Template App",
            Header = "Render Test",
            Paragraphs =
            [
                "This is a rendered email body.",
            ],
        });

        html.Should().Contain("Template App");
        html.Should().Contain("Render Test");
        html.Should().Contain("This is a rendered email body.");
        html.Should().NotContain("<mjml");
    }
}
