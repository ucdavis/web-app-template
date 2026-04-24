namespace Server.Core.Notification;

public sealed class DefaultNotificationTemplateModel
{
    public string AppName { get; init; } = string.Empty;
    public string Header { get; init; } = string.Empty;
    public List<string> Paragraphs { get; init; } = [];
    public string ButtonText { get; init; } = string.Empty;
    public string ButtonUrl { get; init; } = string.Empty;
}

public sealed class NotificationButtonModel
{
    public NotificationButtonModel(string text, string url)
    {
        Text = text;
        Url = url;
    }

    public string Text { get; }
    public string Url { get; }
}
