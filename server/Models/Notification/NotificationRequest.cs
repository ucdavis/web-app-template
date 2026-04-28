using System.ComponentModel.DataAnnotations;

namespace Server.Models.Notification;

public sealed class NotificationRequest
{
    private string? _to;

    [EmailAddress]
    public string? To
    {
        get => _to;
        init => _to = string.IsNullOrWhiteSpace(value) ? null : value;
    }

    [Required]
    public string Subject { get; init; } = string.Empty;

    [Required]
    public string Header { get; init; } = string.Empty;

    [Required]
    public string Message { get; init; } = string.Empty;
}
