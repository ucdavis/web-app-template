using System.Globalization;
using Markdig;
using Markdig.Renderers;
using Markdig.Syntax;
using Markdig.Syntax.Inlines;

namespace Server.Core.Markdown;

public interface IMarkdownHtmlRenderer
{
    string Render(string markdown);
}

public sealed class MarkdigMarkdownHtmlRenderer : IMarkdownHtmlRenderer
{
    private static readonly MarkdownPipeline MarkdownPipeline = new MarkdownPipelineBuilder()
        .UseAdvancedExtensions()
        .DisableHtml()
        .Build();

    public string Render(string markdown)
    {
        var document = Markdig.Markdown.Parse(markdown, MarkdownPipeline);
        SanitizeLinks(document);

        using var writer = new StringWriter(CultureInfo.InvariantCulture);
        var renderer = new HtmlRenderer(writer);
        MarkdownPipeline.Setup(renderer);
        renderer.Render(document);
        writer.Flush();

        return writer.ToString();
    }

    private static void SanitizeLinks(MarkdownDocument document)
    {
        foreach (var link in document.Descendants<LinkInline>())
        {
            if (!IsSafeMarkdownUrl(link.Url))
            {
                link.Url = string.Empty;
            }
        }
    }

    private static bool IsSafeMarkdownUrl(string? url)
    {
        if (string.IsNullOrWhiteSpace(url))
        {
            return false;
        }

        var trimmedUrl = url.Trim();
        if (trimmedUrl.StartsWith('/') ||
            trimmedUrl.StartsWith('#') ||
            trimmedUrl.StartsWith("./") ||
            trimmedUrl.StartsWith("../"))
        {
            return true;
        }

        return Uri.TryCreate(trimmedUrl, UriKind.Absolute, out var parsedUrl) &&
               (parsedUrl.Scheme == Uri.UriSchemeHttp ||
                parsedUrl.Scheme == Uri.UriSchemeHttps ||
                parsedUrl.Scheme == Uri.UriSchemeMailto ||
                parsedUrl.Scheme == "tel");
    }
}
