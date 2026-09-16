namespace Server.Core.Notification;

public abstract class NotificationTemplateModelBase
{
    public string AppName { get; init; } = string.Empty;
    public string ButtonText { get; init; } = string.Empty;
    public string ButtonUrl { get; init; } = string.Empty;
    public string? LayoutWidth { get; init; }
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
