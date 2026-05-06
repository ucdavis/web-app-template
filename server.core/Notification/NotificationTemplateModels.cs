namespace Server.Core.Notification;

public abstract class NotificationTemplateModelBase
{
    public string AppName { get; init; } = string.Empty;
    public string ButtonText { get; init; } = string.Empty;
    public string ButtonUrl { get; init; } = string.Empty;
    public string? LayoutWidth { get; init; }
}

public sealed class DefaultNotificationTemplateModel : NotificationTemplateModelBase
{
    public string Header { get; init; } = string.Empty;
    public IReadOnlyList<string> Paragraphs { get; init; } = [];

}

public sealed class TableNotificationTemplateModel : NotificationTemplateModelBase
{
    public string Header { get; init; } = string.Empty;
    public string Message { get; init; } = string.Empty;
    public string FirstColumnHeader { get; init; } = "Item";
    public string SecondColumnHeader { get; init; } = "Details";
    public string AmountColumnHeader { get; init; } = "Amount";
    public IReadOnlyList<NotificationTableRow> Rows { get; init; } = [];
    public string TotalLabel { get; init; } = "Total";
    public decimal TotalAmount { get; init; }
}

public sealed class NotificationTableRow
{
    public string Title { get; init; } = string.Empty;
    public string Details { get; init; } = string.Empty;
    public decimal Amount { get; init; }
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
