using Microsoft.AspNetCore.Mvc;
using Server.Core.Markdown;
using Server.Models.Markdown;

namespace Server.Controllers;

public sealed class MarkdownController : ApiControllerBase
{
    private readonly IMarkdownHtmlRenderer _markdownHtmlRenderer;

    public MarkdownController(IMarkdownHtmlRenderer markdownHtmlRenderer)
    {
        _markdownHtmlRenderer = markdownHtmlRenderer;
    }

    [HttpPost("preview")]
    [ProducesResponseType(typeof(MarkdownPreviewResponse), StatusCodes.Status200OK)]
    public ActionResult<MarkdownPreviewResponse> Preview([FromBody] MarkdownPreviewRequest request)
    {
        return Ok(new MarkdownPreviewResponse
        {
            Html = _markdownHtmlRenderer.Render(request.Markdown),
        });
    }
}
