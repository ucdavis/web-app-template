using MailKit.Security;

namespace server.core.Services.Notification.Email;

internal static class EmailTransportSecurity
{
    public static SecureSocketOptions GetSocketOptions(SmtpOptions options)
    {
        ArgumentNullException.ThrowIfNull(options);

        if (!options.UseSsl)
        {
            return SecureSocketOptions.None;
        }

        return options.Port == 465
            ? SecureSocketOptions.SslOnConnect
            : SecureSocketOptions.StartTls;
    }
}
