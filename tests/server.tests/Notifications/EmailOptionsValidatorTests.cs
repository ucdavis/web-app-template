using FluentAssertions;
using server.core.Notifications;

namespace server.tests.Notifications;

public class EmailOptionsValidatorTests
{
    [Fact]
    public void Validate_requires_smtp_fields()
    {
        var validator = new EmailOptionsValidator();

        var result = validator.Validate(name: null, new EmailOptions
        {
            Port = 0,
        });

        result.Failed.Should().BeTrue();
        result.Failures.Should().Contain(error => error.Contains("Email:Host"));
        result.Failures.Should().Contain(error => error.Contains("Email:Username"));
        result.Failures.Should().Contain(error => error.Contains("Email:Password"));
        result.Failures.Should().Contain(error => error.Contains("Email:FromEmail"));
        result.Failures.Should().Contain(error => error.Contains("Email:FromName"));
        result.Failures.Should().Contain(error => error.Contains("Email:Port"));
    }

    [Fact]
    public void Validate_succeeds_with_required_values()
    {
        var validator = new EmailOptionsValidator();

        var result = validator.Validate(name: null, new EmailOptions
        {
            Host = "sandbox.smtp.mailtrap.io",
            Port = 587,
            Username = "smtp-user",
            Password = "smtp-password",
            FromEmail = "no-reply@example.test",
            FromName = "Template App",
        });

        result.Succeeded.Should().BeTrue();
    }
}
