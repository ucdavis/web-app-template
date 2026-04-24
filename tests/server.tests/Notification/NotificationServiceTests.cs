using FluentAssertions;
using Microsoft.Extensions.Options;
using Server.Core.Notification;

namespace Server.Tests.Notification;

public class NotificationServiceTests
{
    [Fact]
    public async Task SendAsync_renders_the_template_and_sends_the_email()
    {
        var emailService = new CaptureEmailService();
        var notificationRenderer = new CaptureNotificationRenderer();
        var service = new NotificationService(
            emailService,
            notificationRenderer,
            Options.Create(new NotificationOptions
            {
                BaseUrl = "https://example.test",
                DefaultAppName = "Notification Center",
                DefaultButtonText = "Review notification",
            }),
            Options.Create(new SmtpOptions
            {
                FromName = "Template App",
            }));

        await service.SendAsync(new EmailRecipients
        {
            To = ["person@example.com"],
        }, "Notification subject", "Notification header", "Notification message");

        notificationRenderer.TemplatePath.Should().Be("/Views/Emails/DefaultNotification_mjml.cshtml");
        notificationRenderer.Model.Should().BeOfType<DefaultNotificationTemplateModel>();

        var model = (DefaultNotificationTemplateModel)notificationRenderer.Model!;
        model.AppName.Should().Be("Notification Center");
        model.Header.Should().Be("Notification header");
        model.Paragraphs.Should().Contain("Notification message");
        model.ButtonText.Should().Be("Review notification");
        model.ButtonUrl.Should().Be("https://example.test");

        emailService.Message.Should().NotBeNull();
        emailService.Message!.Recipients.Should().BeEquivalentTo(new EmailRecipients
        {
            To = ["person@example.com"],
            Cc = [],
            Bcc = [],
        });
        emailService.Message.Subject.Should().Be("Notification subject");
        emailService.Message.TextBody.Should().Be(
            $"Notification header{Environment.NewLine}{Environment.NewLine}Notification message");
        emailService.Message.HtmlBody.Should().Be(CaptureNotificationRenderer.RenderedHtml);
    }

    private sealed class CaptureEmailService : IEmailService
    {
        public EmailMessage? Message { get; private set; }

        public Task SendAsync(EmailMessage message, CancellationToken cancellationToken = default)
        {
            Message = message;
            return Task.CompletedTask;
        }
    }

    private sealed class CaptureNotificationRenderer : INotificationRenderer
    {
        public const string RenderedHtml = "<html><body>Rendered notification</body></html>";

        public string? TemplatePath { get; private set; }
        public object? Model { get; private set; }

        public Task<string> RenderAsync<TModel>(
            string templatePath,
            TModel model,
            CancellationToken cancellationToken = default)
        {
            TemplatePath = templatePath;
            Model = model;

            return Task.FromResult(RenderedHtml);
        }
    }
}
