using System.ComponentModel.DataAnnotations;

namespace Server.Models.Notification;

public sealed class TableNotificationRequest
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

    public string Message { get; init; } = string.Empty;

    [MinLength(1)]
    public IReadOnlyList<TableNotificationRowRequest> Rows { get; init; } = [];

    public decimal TotalAmount { get; init; }
}

public sealed class TableNotificationRowRequest
{
    [Required]
    public string Title { get; init; } = string.Empty;

    [Required]
    public string Details { get; init; } = string.Empty;

    public decimal Amount { get; init; }
}