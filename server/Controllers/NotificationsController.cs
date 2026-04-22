using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using server.core.Notifications;
using Server.Models.Notifications;

namespace Server.Controllers;

public sealed class NotificationsController : ApiControllerBase
{
    private readonly IHostEnvironment _environment;
    private readonly INotificationService _notificationService;

    public NotificationsController(
        IHostEnvironment environment,
        INotificationService notificationService)
    {
        _environment = environment;
        _notificationService = notificationService;
    }

    [HttpPost("default")]
    public async Task<IActionResult> SendSample(
        [FromBody] NotificationRequest request,
        CancellationToken cancellationToken)
    {
        if (!_environment.IsDevelopment())
        {
            return NotFound();
        }

        var resolvedRecipient = ResolveRecipient(request.To);
        if (string.IsNullOrWhiteSpace(resolvedRecipient))
        {
            return BadRequest("No email recipient was provided and the current user does not have an email claim.");
        }

        try
        {
            await _notificationService.SendAsync(new EmailRecipients
            {
                To = [resolvedRecipient],
            }, request.Subject, request.Header, request.Message, cancellationToken);
        }
        catch (ValidationException ex)
        {
            return BadRequest(ex.Message);
        }

        return Ok(new
        {
            to = resolvedRecipient,
        });
    }

    private string? ResolveRecipient(string? requestedRecipient)
    {
        if (!string.IsNullOrWhiteSpace(requestedRecipient))
        {
            return requestedRecipient;
        }

        return User.FindFirst("preferred_username")?.Value
               ?? User.FindFirst(ClaimTypes.Email)?.Value;
    }
}
