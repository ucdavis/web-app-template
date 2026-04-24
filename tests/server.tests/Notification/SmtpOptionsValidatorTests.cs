using FluentAssertions;
using server.core.Notification;

namespace server.tests.Notification;

public class SmtpOptionsValidatorTests
{
    [Fact]
    public void Validate_requires_smtp_fields()
    {
        var validator = new SmtpOptionsValidator();

        var result = validator.Validate(name: null, new SmtpOptions
        {
            Port = 0,
        });

        result.Failed.Should().BeTrue();
        result.Failures.Should().Contain(error => error.Contains("Smtp:Host"));
        result.Failures.Should().Contain(error => error.Contains("Smtp:Username"));
        result.Failures.Should().Contain(error => error.Contains("Smtp:Password"));
        result.Failures.Should().Contain(error => error.Contains("Smtp:FromEmail"));
        result.Failures.Should().Contain(error => error.Contains("Smtp:FromName"));
        result.Failures.Should().Contain(error => error.Contains("Smtp:Port"));
    }

    [Fact]
    public void Validate_rejects_invalid_port_timeout_and_email_formats()
    {
        var validator = new SmtpOptionsValidator();

        var result = validator.Validate(name: null, new SmtpOptions
        {
            Host = "sandbox.smtp.mailtrap.io",
            Port = 70000,
            Timeout = 0,
            Username = "smtp-user",
            Password = "smtp-password",
            FromEmail = "not-an-email",
            FromName = "Template App",
            ReplyToEmail = "bad-reply-to",
            BccEmail = "bad-bcc",
        });

        result.Failed.Should().BeTrue();
        result.Failures.Should().Contain("Smtp:Port must be between 1 and 65535.");
        result.Failures.Should().Contain("Smtp:Timeout must be greater than 0.");
        result.Failures.Should().Contain("Smtp:FromEmail is not a valid email address.");
        result.Failures.Should().Contain("Smtp:ReplyToEmail is not a valid email address.");
        result.Failures.Should().Contain("Smtp:BccEmail is not a valid email address.");
    }

    [Fact]
    public void Validate_succeeds_with_required_values()
    {
        var validator = new SmtpOptionsValidator();

        var result = validator.Validate(name: null, new SmtpOptions
        {
            Host = "sandbox.smtp.mailtrap.io",
            Port = 587,
            Timeout = 30000,
            Username = "smtp-user",
            Password = "smtp-password",
            FromEmail = "no-reply@example.test",
            FromName = "Template App",
            ReplyToEmail = "reply-to@example.test",
            BccEmail = "audit@example.test",
        });

        result.Succeeded.Should().BeTrue();
    }
}
