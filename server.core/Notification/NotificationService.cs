using System.ComponentModel.DataAnnotations;
using Microsoft.Extensions.Options;

namespace Server.Core.Notification;

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
    private readonly NotificationOptions _notificationOptions;
    private readonly INotificationRenderer _notificationRenderer;
    private readonly SmtpOptions _smtpOptions;

    public NotificationService(
        IEmailService emailService,
        INotificationRenderer notificationRenderer,
        IOptions<NotificationOptions> notificationOptions,
        IOptions<SmtpOptions> smtpOptions)
    {
        _emailService = emailService;
        _notificationRenderer = notificationRenderer;
        _notificationOptions = notificationOptions.Value;
        _smtpOptions = smtpOptions.Value;
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

        var appName = string.IsNullOrWhiteSpace(_notificationOptions.DefaultAppName)
            ? _smtpOptions.FromName
            : _notificationOptions.DefaultAppName;

        var model = new DefaultNotificationTemplateModel
        {
            AppName = appName,
            Header = header,
            Paragraphs =
            [
                message,
            ],
            ButtonText = string.IsNullOrWhiteSpace(_notificationOptions.BaseUrl) ? string.Empty : _notificationOptions.DefaultButtonText,
            ButtonUrl = _notificationOptions.BaseUrl,
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
