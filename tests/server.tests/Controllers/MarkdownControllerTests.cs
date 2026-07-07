using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Server.Controllers;
using Server.Models.Markdown;

namespace Server.Tests.Controllers;

public class MarkdownControllerTests
{
    [Fact]
    public void Preview_renders_markdown_to_html()
    {
        var controller = new MarkdownController();

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
        var controller = new MarkdownController();

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
    public void Preview_encodes_raw_html()
    {
        var controller = new MarkdownController();

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