using MailKit.Security;

namespace server.core.Notifications;

internal static class EmailTransportSecurity
{
    public static SecureSocketOptions GetSocketOptions(EmailOptions options)
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
