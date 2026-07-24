using System.Globalization;
using System.Text;
using Markdig;
using Markdig.Renderers;
using Markdig.Renderers.Html;
using Markdig.Syntax;
using Markdig.Syntax.Inlines;

namespace server.core.Services.Markdown;

public interface IMarkdownHtmlRenderer
{
    string Render(string markdown);
}

public sealed class MarkdigMarkdownHtmlRenderer : IMarkdownHtmlRenderer
{
    private static readonly HashSet<string> AllowedHtmlAttributeNames = new(StringComparer.OrdinalIgnoreCase)
    {
        "title",
    };

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
        foreach (var markdownObject in document.Descendants<MarkdownObject>())
        {
            SanitizeRenderedAttributes(markdownObject);
        }

        foreach (var link in document.Descendants<LinkInline>())
        {
            if (!IsSafeMarkdownUrl(link.Url))
            {
                link.Url = string.Empty;
            }
        }
    }

    private static void SanitizeRenderedAttributes(MarkdownObject markdownObject)
    {
        var attributes = markdownObject.TryGetAttributes();

        if (attributes is null)
        {
            return;
        }

        attributes.Id = markdownObject is HeadingBlock heading
            ? GetSafeHeadingId(heading, attributes.Id)
            : null;
        attributes.Classes?.Clear();

        if (attributes.Properties is null)
        {
            return;
        }

        attributes.Properties.RemoveAll(attribute =>
            !AllowedHtmlAttributeNames.Contains(attribute.Key));
    }

    private static string? GetSafeHeadingId(HeadingBlock heading, string? currentId)
    {
        var headingSlug = CreateHeadingSlug(heading);

        if (string.IsNullOrEmpty(headingSlug))
        {
            return null;
        }

        return IsGeneratedHeadingId(currentId, headingSlug) ? currentId : headingSlug;
    }

    private static bool IsGeneratedHeadingId(string? id, string headingSlug)
    {
        if (string.IsNullOrEmpty(id))
        {
            return false;
        }

        if (id == headingSlug)
        {
            return true;
        }

        var duplicatePrefix = $"{headingSlug}-";
        return id.StartsWith(duplicatePrefix, StringComparison.Ordinal) &&
               id[duplicatePrefix.Length..].All(char.IsDigit);
    }

    private static string CreateHeadingSlug(HeadingBlock heading)
    {
        var headingText = new StringBuilder();

        if (heading.Inline is not null)
        {
            AppendInlineText(heading.Inline, headingText);
        }

        var slug = new StringBuilder();
        var previousWasDash = false;

        foreach (var character in headingText.ToString().ToLowerInvariant())
        {
            if (char.IsLetterOrDigit(character))
            {
                slug.Append(character);
                previousWasDash = false;
                continue;
            }

            if ((char.IsWhiteSpace(character) || character == '-') &&
                slug.Length > 0 &&
                !previousWasDash)
            {
                slug.Append('-');
                previousWasDash = true;
            }
        }

        while (slug.Length > 0 && slug[^1] == '-')
        {
            slug.Length--;
        }

        return slug.ToString();
    }

    private static void AppendInlineText(ContainerInline container, StringBuilder builder)
    {
        for (var inline = container.FirstChild; inline is not null; inline = inline.NextSibling)
        {
            switch (inline)
            {
                case LiteralInline literal:
                    builder.Append(literal.Content);
                    break;
                case CodeInline code:
                    builder.Append(code.Content);
                    break;
                case ContainerInline childContainer:
                    AppendInlineText(childContainer, builder);
                    break;
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
        if (trimmedUrl.Contains('\\') || trimmedUrl.StartsWith("//"))
        {
            return false;
        }

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
