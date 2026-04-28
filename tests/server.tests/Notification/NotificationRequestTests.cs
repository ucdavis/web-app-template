using System.ComponentModel.DataAnnotations;
using FluentAssertions;
using Server.Models.Notification;

namespace Server.Tests.Notification;

public class NotificationRequestTests
{
    [Fact]
    public void Blank_recipient_override_is_normalized_to_null_and_passes_validation()
    {
        var request = new NotificationRequest
        {
            To = "   ",
            Subject = "Subject",
            Header = "Header",
            Message = "Message",
        };

        var validationResults = new List<ValidationResult>();
        var isValid = Validator.TryValidateObject(
            request,
            new ValidationContext(request),
            validationResults,
            validateAllProperties: true);

        isValid.Should().BeTrue();
        request.To.Should().BeNull();
        validationResults.Should().BeEmpty();
    }

    [Fact]
    public void Invalid_recipient_override_still_fails_validation()
    {
        var request = new NotificationRequest
        {
            To = "not-an-email",
            Subject = "Subject",
            Header = "Header",
            Message = "Message",
        };

        var validationResults = new List<ValidationResult>();
        var isValid = Validator.TryValidateObject(
            request,
            new ValidationContext(request),
            validationResults,
            validateAllProperties: true);

        isValid.Should().BeFalse();
        validationResults.Should().ContainSingle(result =>
            result.MemberNames.Contains(nameof(NotificationRequest.To)));
    }
}
