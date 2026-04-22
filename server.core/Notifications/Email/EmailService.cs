using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;

namespace server.core.Notifications;

public interface IEmailService
{
    Task SendAsync(EmailMessage message, CancellationToken cancellationToken = default);
}

public sealed class EmailService : IEmailService
{
    private readonly EmailOptions _options;

    public EmailService(IOptions<EmailOptions> options)
    {
        _options = options.Value;
    }

    public async Task SendAsync(EmailMessage message, CancellationToken cancellationToken = default)
    {
        EmailValidation.ValidateMessage(message);

        using var smtpClient = new SmtpClient();
        using var mimeMessage = BuildMimeMessage(message);
        var socketOptions = EmailTransportSecurity.GetSocketOptions(_options);

        await smtpClient.ConnectAsync(_options.Host, _options.Port, socketOptions, cancellationToken);
        await smtpClient.AuthenticateAsync(_options.Username, _options.Password, cancellationToken);
        await smtpClient.SendAsync(mimeMessage, cancellationToken);
        await smtpClient.DisconnectAsync(true, cancellationToken);
    }

    private MimeMessage BuildMimeMessage(EmailMessage message)
    {
        var mimeMessage = new MimeMessage();

        mimeMessage.From.Add(new MailboxAddress(_options.FromName, _options.FromEmail));

        AddMailboxRange(mimeMessage.To, message.Recipients.To);
        AddMailboxRange(mimeMessage.Cc, message.Recipients.Cc);
        AddMailboxRange(mimeMessage.Bcc, message.Recipients.Bcc);

        if (!string.IsNullOrWhiteSpace(_options.BccEmail))
        {
            mimeMessage.Bcc.Add(MailboxAddress.Parse(_options.BccEmail));
        }

        if (!string.IsNullOrWhiteSpace(_options.ReplyToEmail))
        {
            mimeMessage.ReplyTo.Add(MailboxAddress.Parse(_options.ReplyToEmail));
        }

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
