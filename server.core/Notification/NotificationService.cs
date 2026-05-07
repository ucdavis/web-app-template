using System.ComponentModel.DataAnnotations;
using System.Globalization;
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

    Task SendTableAsync(
        EmailRecipients recipients,
        string subject,
        string header,
        string message,
        IReadOnlyList<NotificationTableRow> rows,
        decimal totalAmount,
        NotificationInfoCardModel? infoCard = null,
        CancellationToken cancellationToken = default);
}

public sealed class NotificationService : INotificationService
{
    private const string DefaultTemplatePath = "/Views/Emails/DefaultNotification_mjml.cshtml";
    private const string TableTemplatePath = "/Views/Emails/TableNotification_mjml.cshtml";
    private static readonly CultureInfo CurrencyCulture = CultureInfo.GetCultureInfo("en-US");

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

    public async Task SendTableAsync(
        EmailRecipients recipients,
        string subject,
        string header,
        string message,
        IReadOnlyList<NotificationTableRow> rows,
        decimal totalAmount,
        NotificationInfoCardModel? infoCard = null,
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

        if (rows.Count == 0)
        {
            throw new ValidationException("At least one table row is required.");
        }

        if (rows.Any(row => row is null || string.IsNullOrWhiteSpace(row.Title) || string.IsNullOrWhiteSpace(row.Details)))
        {
            throw new ValidationException("Each table row requires a title and details.");
        }

        if (infoCard is { Items.Count: 0 })
        {
            throw new ValidationException("At least one info card item is required when an info card is provided.");
        }

        if (infoCard?.Items.Any(item => item is null || string.IsNullOrWhiteSpace(item.Label) || string.IsNullOrWhiteSpace(item.Value)) == true)
        {
            throw new ValidationException("Each info card item requires a label and value.");
        }

        if (infoCard is not null && !NotificationInfoCardModel.IsSupportedBackgroundColor(infoCard.BackgroundColor))
        {
            throw new ValidationException("Info card background color must be a supported light shade.");
        }

        EmailValidation.ValidateRecipients(recipients);

        var appName = string.IsNullOrWhiteSpace(_notificationOptions.DefaultAppName)
            ? _smtpOptions.FromName
            : _notificationOptions.DefaultAppName;

        var model = new TableNotificationTemplateModel
        {
            AppName = appName,
            Header = header,
            LayoutWidth = "800px",
            Message = message,
            Rows = rows,
            TotalAmount = totalAmount,
            InfoCard = infoCard,
            ButtonText = string.IsNullOrWhiteSpace(_notificationOptions.BaseUrl) ? string.Empty : _notificationOptions.DefaultButtonText,
            ButtonUrl = _notificationOptions.BaseUrl,
        };


        var textLines = new List<string>
        {
            header,
        };

        if (!string.IsNullOrWhiteSpace(message))
        {
            textLines.Add(string.Empty);
            textLines.Add(message);
        }

        textLines.Add(string.Empty);
        textLines.AddRange(rows.Select(row =>
            $"- {row.Title}: {row.Details} ({row.Amount.ToString("C2", CurrencyCulture)})"));
        textLines.Add(string.Empty);
        textLines.Add($"Total: {totalAmount.ToString("C2", CurrencyCulture)}");

        if (infoCard is not null)
        {
            textLines.Add(string.Empty);
            textLines.AddRange(infoCard.Items.Select(item => $"{item.Label}: {item.Value}"));
        }

        var textBody = string.Join(Environment.NewLine, textLines);
        var htmlBody = await _notificationRenderer.RenderAsync(
            TableTemplatePath,
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
