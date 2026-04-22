using System.ComponentModel.DataAnnotations;

namespace server.core.Notifications;

public sealed class EmailMessage
{
    [Required]
    public EmailRecipients Recipients { get; init; } = new();

    [Required]
    public string Subject { get; init; } = string.Empty;

    [Required]
    public string TextBody { get; init; } = string.Empty;

    public string HtmlBody { get; init; } = string.Empty;
}
