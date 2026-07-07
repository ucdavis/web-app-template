using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Server.Controllers;
using Server.Core.Markdown;
using Server.Models.Markdown;

namespace Server.Tests.Controllers;

public class MarkdownControllerTests
{
    [Fact]
    public void Preview_renders_markdown_to_html()
    {
        var controller = new MarkdownController(new MarkdigMarkdownHtmlRenderer());

        var result = controller.Preview(new MarkdownPreviewRequest
        {
            Markdown = "## Heading\n\n- First\n- Second",
        });

        var response = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var model = response.Value.Should().BeOfType<MarkdownPreviewResponse>().Subject;

        model.Html.Should().Contain("<h2 id=\"heading\">Heading</h2>");
        model.Html.Should().Contain("<li>First</li>");
        model.Html.Should().Contain("<li>Second</li>");
    }

    [Fact]
    public void Preview_removes_unsafe_markdown_link_urls()
    {
        var controller = new MarkdownController(new MarkdigMarkdownHtmlRenderer());

        var result = controller.Preview(new MarkdownPreviewRequest
        {
            Markdown = "[Unsafe](javascript:alert(1))",
        });

        var response = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var model = response.Value.Should().BeOfType<MarkdownPreviewResponse>().Subject;

        model.Html.Should().NotContain("javascript:alert");
        model.Html.Should().Contain("<a href=\"\">Unsafe</a>");
    }

    [Fact]
    public void Preview_removes_protocol_relative_markdown_urls()
    {
        var controller = new MarkdownController(new MarkdigMarkdownHtmlRenderer());

        var result = controller.Preview(new MarkdownPreviewRequest
        {
            Markdown = "[Unsafe](//evil.com/path)\n\n![Logo](//evil.com/logo.png)",
        });

        var response = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var model = response.Value.Should().BeOfType<MarkdownPreviewResponse>().Subject;

        model.Html.Should().NotContain("//evil.com");
        model.Html.Should().Contain("<a href=\"\">Unsafe</a>");
        model.Html.Should().Contain("<img src=\"\" alt=\"Logo\"");
    }

    [Fact]
    public void Preview_removes_unsafe_rendered_attributes()
    {
        var controller = new MarkdownController(new MarkdigMarkdownHtmlRenderer());

        var result = controller.Preview(new MarkdownPreviewRequest
        {
            Markdown = "## Heading {onclick=\"alert(1)\" style=\"background:url(javascript:alert(1))\"}\n\n[Link](https://example.com){onclick=\"alert(1)\"}\n\n![Logo](https://example.com/logo.png){onerror=\"alert(1)\"}",
        });

        var response = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var model = response.Value.Should().BeOfType<MarkdownPreviewResponse>().Subject;

        model.Html.Should().NotContain("onclick");
        model.Html.Should().NotContain("onerror");
        model.Html.Should().NotContain("javascript:alert");
        model.Html.Should().NotContain("style=");
        model.Html.Should().Contain("<h2 id=\"heading\">Heading</h2>");
        model.Html.Should().Contain("<a href=\"https://example.com\">Link</a>");
        model.Html.Should().Contain("<img src=\"https://example.com/logo.png\" alt=\"Logo\"");
    }

    [Fact]
    public void Preview_encodes_raw_html()
    {
        var controller = new MarkdownController(new MarkdigMarkdownHtmlRenderer());

        var result = controller.Preview(new MarkdownPreviewRequest
        {
            Markdown = "<script>alert(1)</script>",
        });

        var response = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var model = response.Value.Should().BeOfType<MarkdownPreviewResponse>().Subject;

        model.Html.Should().NotContain("<script>");
        model.Html.Should().Contain("&lt;script&gt;alert(1)&lt;/script&gt;");
    }
}