using Mjml.Net;
using Microsoft.Extensions.Logging;
using Razor.Templating.Core;

namespace server.core.Notification;

public interface INotificationRenderer
{
    Task<string> RenderAsync<TModel>(string templatePath, TModel model, CancellationToken cancellationToken = default);
}

public sealed class RazorMjmlNotificationRenderer : INotificationRenderer
{
    private readonly IRazorTemplateEngine _razorTemplateEngine;
    private readonly MjmlRenderer _mjmlRenderer;
    private readonly ILogger<RazorMjmlNotificationRenderer> _logger;

    public RazorMjmlNotificationRenderer(
        IRazorTemplateEngine razorTemplateEngine,
        MjmlRenderer mjmlRenderer,
        ILogger<RazorMjmlNotificationRenderer> logger)
    {
        _razorTemplateEngine = razorTemplateEngine;
        _mjmlRenderer = mjmlRenderer;
        _logger = logger;
    }

    public async Task<string> RenderAsync<TModel>(string templatePath, TModel model, CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(templatePath);

        cancellationToken.ThrowIfCancellationRequested();
        var mjmlMarkup = await _razorTemplateEngine.RenderAsync(templatePath, model);
        cancellationToken.ThrowIfCancellationRequested();

        var (html, errors) = _mjmlRenderer.Render(mjmlMarkup, new MjmlOptions
        {
            Beautify = false,
        });

        if (errors.Count > 0)
        {
            var errorMessage = string.Join(Environment.NewLine, errors.Select(error => error.ToString()));
            _logger.LogError("MJML rendering failed for template {TemplatePath}: {Errors}", templatePath, errorMessage);
            throw new InvalidOperationException($"Failed to render MJML email template '{templatePath}'.");
        }

        return html;
    }
}
