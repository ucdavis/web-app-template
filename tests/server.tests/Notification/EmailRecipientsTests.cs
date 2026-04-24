using System.ComponentModel.DataAnnotations;
using FluentAssertions;
using Server.Core.Notification;

namespace Server.Tests.Notification;

public class EmailRecipientsTests
{
    [Fact]
    public void Validation_accepts_valid_email_lists()
    {
        var recipients = new EmailRecipients
        {
            To = ["person@example.com"],
            Cc = ["copy@example.com"],
            Bcc = ["blind@example.com"],
        };

        var validationResults = Validate(recipients);

        validationResults.Should().BeEmpty();
    }

    [Fact]
    public void Validation_rejects_invalid_email_addresses()
    {
        var recipients = new EmailRecipients
        {
            To = ["not-an-email"],
        };

        var validationResults = Validate(recipients);

        validationResults.Should().ContainSingle();
        validationResults[0].ErrorMessage.Should().Contain("invalid email address");
    }

    [Fact]
    public void Validation_requires_at_least_one_to_recipient()
    {
        var recipients = new EmailRecipients
        {
            To = [],
        };

        var validationResults = Validate(recipients);

        validationResults.Should().ContainSingle();
        validationResults[0].ErrorMessage.Should().Contain("requires at least 1 email address");
    }

    private static List<ValidationResult> Validate(EmailRecipients recipients)
    {
        var validationResults = new List<ValidationResult>();

        Validator.TryValidateObject(
            recipients,
            new ValidationContext(recipients),
            validationResults,
            validateAllProperties: true);

        return validationResults;
    }
}
