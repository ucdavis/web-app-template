namespace server.core.Notification;

public sealed class NotificationOptions
{
    public const string SectionName = "Notification";

    public string BaseUrl { get; init; } = string.Empty;
    public string DefaultAppName { get; init; } = string.Empty;
    public string DefaultButtonText { get; init; } = "Open the application";
}
