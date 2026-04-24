using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Server.Core.Notification;
using Server.Models.Notification;

namespace Server.Controllers;

public sealed class NotificationController : ApiControllerBase
{
    private readonly IHostEnvironment _environment;
    private readonly ILogger<NotificationController> _logger;
    private readonly INotificationService _notificationService;

    public NotificationController(
        IHostEnvironment environment,
        ILogger<NotificationController> logger,
        INotificationService notificationService)
    {
        _environment = environment;
        _logger = logger;
        _notificationService = notificationService;
    }

    [HttpPost("default")]
    [ProducesResponseType(typeof(SendSampleNotificationResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
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
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to deliver notification email to {Recipient}.", resolvedRecipient);
            return StatusCode(StatusCodes.Status502BadGateway,
                "The notification email could not be sent due to a delivery error.");
        }

        return Ok(new SendSampleNotificationResponse
        {
            To = resolvedRecipient,
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
