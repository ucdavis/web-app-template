using FluentAssertions;
using MailKit.Security;
using Server.Core.Notification;

namespace Server.Tests.Notification;

public class EmailTransportSecurityTests
{
    [Theory]
    [InlineData(false, 25, SecureSocketOptions.None)]
    [InlineData(false, 587, SecureSocketOptions.None)]
    [InlineData(true, 465, SecureSocketOptions.SslOnConnect)]
    [InlineData(true, 587, SecureSocketOptions.StartTls)]
    [InlineData(true, 2525, SecureSocketOptions.StartTls)]
    public void GetSocketOptions_selects_the_expected_transport_mode(
        bool useSsl,
        int port,
        SecureSocketOptions expected)
    {
        var options = new SmtpOptions
        {
            Port = port,
            UseSsl = useSsl,
        };

        var actual = EmailTransportSecurity.GetSocketOptions(options);

        actual.Should().Be(expected);
    }
}
