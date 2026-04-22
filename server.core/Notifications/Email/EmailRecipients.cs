namespace server.core.Notifications;

public sealed class EmailRecipients
{
    [EmailAddressList(nonEmpty: true)]
    public string[] To { get; init; } = [];

    [EmailAddressList]
    public string[] Cc { get; init; } = [];

    [EmailAddressList]
    public string[] Bcc { get; init; } = [];
}
