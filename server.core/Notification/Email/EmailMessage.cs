namespace Server.Core.Notification;

public sealed class EmailMessage
{
    public EmailRecipients Recipients { get; init; } = new();

    public string Subject { get; init; } = string.Empty;

    public string TextBody { get; init; } = string.Empty;

    public string HtmlBody { get; init; } = string.Empty;
}
