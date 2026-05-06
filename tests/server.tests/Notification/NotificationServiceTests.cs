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

    [Fact]
    public async Task SendAsync_falls_back_to_smtp_from_name_when_app_name_is_empty()
    {
        var emailService = new CaptureEmailService();
        var notificationRenderer = new CaptureNotificationRenderer();
        var service = new NotificationService(
            emailService,
            notificationRenderer,
            Options.Create(new NotificationOptions
            {
                BaseUrl = "",
                DefaultAppName = "",
                DefaultButtonText = "Open the application",
            }),
            Options.Create(new SmtpOptions
            {
                FromName = "Fallback App Name",
            }));

        await service.SendAsync(new EmailRecipients
        {
            To = ["person@example.com"],
        }, "Subject", "Header", "Message");

        var model = notificationRenderer.Model.Should().BeOfType<DefaultNotificationTemplateModel>().Subject;
        model.AppName.Should().Be("Fallback App Name");
        model.ButtonText.Should().BeEmpty();
        model.ButtonUrl.Should().BeEmpty();
    }

    [Fact]
    public async Task SendTableAsync_renders_the_table_template_and_sends_the_email()
    {
        var emailService = new CaptureEmailService();
        var notificationRenderer = new CaptureNotificationRenderer();
        var service = new NotificationService(
            emailService,
            notificationRenderer,
            Options.Create(new NotificationOptions
            {
                DefaultAppName = "Notification Center",
            }),
            Options.Create(new SmtpOptions
            {
                FromName = "Template App",
            }));

        await service.SendTableAsync(new EmailRecipients
        {
            To = ["person@example.com"],
        },
        "Statement subject",
        "Weekly project summary",
        "Five sample rows are rendered into the MJML table.",
        [
            new NotificationTableRow
            {
                Title = "Kickoff",
                Details = "Planning and alignment",
                Amount = 125.50m,
            },
            new NotificationTableRow
            {
                Title = "Build",
                Details = "Implementation sprint",
                Amount = 340m,
            },
        ],
        465.50m);

        notificationRenderer.TemplatePath.Should().Be("/Views/Emails/TableNotification_mjml.cshtml");
        notificationRenderer.Model.Should().BeOfType<TableNotificationTemplateModel>();

        var model = (TableNotificationTemplateModel)notificationRenderer.Model!;
        model.AppName.Should().Be("Notification Center");
        model.Header.Should().Be("Weekly project summary");
        model.LayoutWidth.Should().Be("800px");
        model.Message.Should().Be("Five sample rows are rendered into the MJML table.");
        model.Rows.Should().HaveCount(2);
        model.TotalAmount.Should().Be(465.50m);

        emailService.Message.Should().NotBeNull();
        emailService.Message!.Subject.Should().Be("Statement subject");
        emailService.Message.TextBody.Should().Contain("Kickoff");
        emailService.Message.TextBody.Should().Contain("Total: $465.50");
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
