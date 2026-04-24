using MailKit;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MimeKit;

namespace Server.Core.Notification;

public interface IEmailService
{
    Task SendAsync(EmailMessage message, CancellationToken cancellationToken = default);
}

public sealed class EmailService : IEmailService
{
    private readonly ILogger<EmailService> _logger;
    private readonly SmtpOptions _options;

    public EmailService(IOptions<SmtpOptions> options, ILogger<EmailService> logger)
    {
        _options = options.Value;
        _logger = logger;
    }

    public async Task SendAsync(EmailMessage message, CancellationToken cancellationToken = default)
    {
        EmailValidation.ValidateMessage(message);

        using var smtpClient = new SmtpClient
        {
            Timeout = _options.Timeout,
        };
        using var mimeMessage = BuildMimeMessage(message);
        var socketOptions = EmailTransportSecurity.GetSocketOptions(_options);

        try
        {
            await smtpClient.ConnectAsync(_options.Host, _options.Port, socketOptions, cancellationToken);
            await smtpClient.AuthenticateAsync(_options.Username, _options.Password, cancellationToken);
            await smtpClient.SendAsync(mimeMessage, cancellationToken);
        }
        finally
        {
            try
            {
                await smtpClient.DisconnectAsync(true, cancellationToken);
            }
            catch (ServiceNotConnectedException)
            {
                // Nothing to clean up if the SMTP connection was never established.
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                _logger.LogDebug(
                    "SMTP disconnect was canceled for {Host}:{Port}.",
                    _options.Host,
                    _options.Port);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(
                    ex,
                    "Failed to disconnect cleanly from SMTP server {Host}:{Port}.",
                    _options.Host,
                    _options.Port);
            }
        }
    }

    private MimeMessage BuildMimeMessage(EmailMessage message)
    {
        var mimeMessage = new MimeMessage();

        mimeMessage.From.Add(new MailboxAddress(_options.FromName, _options.FromEmail));

        AddMailboxRange(mimeMessage.To, message.Recipients.To);
        AddMailboxRange(mimeMessage.Cc, message.Recipients.Cc);
        AddMailboxRange(mimeMessage.Bcc, message.Recipients.Bcc);

        AddOptionalConfiguredMailbox(mimeMessage.Bcc, _options.BccEmail, nameof(SmtpOptions.BccEmail));
        AddOptionalConfiguredMailbox(mimeMessage.ReplyTo, _options.ReplyToEmail, nameof(SmtpOptions.ReplyToEmail));

        mimeMessage.Subject = message.Subject;
        mimeMessage.Body = CreateBody(message);

        return mimeMessage;
    }

    private static void AddMailboxRange(InternetAddressList addresses, IEnumerable<string> emails)
    {
        foreach (var email in emails)
        {
            addresses.Add(MailboxAddress.Parse(email));
        }
    }

    private void AddOptionalConfiguredMailbox(InternetAddressList addresses, string email, string optionName)
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            return;
        }

        if (MailboxAddress.TryParse(email, out var mailboxAddress) && mailboxAddress is not null)
        {
            addresses.Add(mailboxAddress);
            return;
        }

        _logger.LogWarning(
            "Skipping invalid configured email address for Smtp:{OptionName}: {EmailAddress}",
            optionName,
            email);
    }

    private static MimeEntity CreateBody(EmailMessage message)
    {
        var textBody = new TextPart("plain")
        {
            Text = message.TextBody,
        };

        if (string.IsNullOrWhiteSpace(message.HtmlBody))
        {
            return textBody;
        }

        return new MultipartAlternative
        {
            textBody,
            new TextPart("html")
            {
                Text = message.HtmlBody,
            },
        };
    }
}
