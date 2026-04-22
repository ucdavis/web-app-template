using System.ComponentModel.DataAnnotations;
using Microsoft.Extensions.Options;

namespace server.core.Notifications;

public interface INotificationService
{
    Task SendAsync(
        EmailRecipients recipients,
        string subject,
        string header,
        string message,
        CancellationToken cancellationToken = default);
}

public sealed class NotificationService : INotificationService
{
    private const string DefaultTemplatePath = "/Views/Emails/DefaultNotification_mjml.cshtml";

    private readonly IEmailService _emailService;
    private readonly INotificationRenderer _notificationRenderer;
    private readonly EmailOptions _emailOptions;

    public NotificationService(
        IEmailService emailService,
        INotificationRenderer notificationRenderer,
        IOptions<EmailOptions> emailOptions)
    {
        _emailService = emailService;
        _notificationRenderer = notificationRenderer;
        _emailOptions = emailOptions.Value;
    }

    public async Task SendAsync(
        EmailRecipients recipients,
        string subject,
        string header,
        string message,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(subject))
        {
            throw new ValidationException("Notification subject is required.");
        }

        if (string.IsNullOrWhiteSpace(header))
        {
            throw new ValidationException("Notification header is required.");
        }

        if (string.IsNullOrWhiteSpace(message))
        {
            throw new ValidationException("Notification message is required.");
        }

        EmailValidation.ValidateRecipients(recipients);

        var appName = string.IsNullOrWhiteSpace(_emailOptions.FromName)
            ? "Application"
            : _emailOptions.FromName;

        var model = new DefaultNotificationTemplateModel
        {
            AppName = appName,
            Header = header,
            Paragraphs =
            [
                message,
            ],
            ButtonText = string.IsNullOrWhiteSpace(_emailOptions.BaseUrl) ? string.Empty : "Open the application",
            ButtonUrl = _emailOptions.BaseUrl,
        };

        var textBody = $"{header}{Environment.NewLine}{Environment.NewLine}{message}";
        var htmlBody = await _notificationRenderer.RenderAsync(
            DefaultTemplatePath,
            model,
            cancellationToken);

        await _emailService.SendAsync(new EmailMessage
        {
            Recipients = recipients,
            Subject = subject,
            TextBody = textBody,
            HtmlBody = htmlBody,
        }, cancellationToken);
    }
}
