using System.ComponentModel.DataAnnotations;
using Microsoft.Extensions.Options;

namespace Server.Core.Notification;

public sealed class SmtpOptions
{
    public const string SectionName = "Smtp";

    public string Host { get; init; } = string.Empty;
    public int Port { get; init; } = 587;
    public int Timeout { get; init; } = 100000;
    public bool UseSsl { get; init; } = true;
    public string Username { get; init; } = string.Empty;
    public string Password { get; init; } = string.Empty;
    public string FromEmail { get; init; } = string.Empty;
    public string FromName { get; init; } = string.Empty;
    public string ReplyToEmail { get; init; } = string.Empty;
    public string BccEmail { get; init; } = string.Empty;
}

public sealed class SmtpOptionsValidator : IValidateOptions<SmtpOptions>
{
    private static readonly EmailAddressAttribute EmailAddressValidator = new();

    public ValidateOptionsResult Validate(string? name, SmtpOptions options)
    {
        ArgumentNullException.ThrowIfNull(options);

        // Treat an empty host as "SMTP disabled" — skip all validation.
        if (string.IsNullOrWhiteSpace(options.Host))
        {
            return ValidateOptionsResult.Success;
        }

        var failures = new List<string>();

        static void Require(List<string> errors, string key, string value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                errors.Add($"Smtp:{key} is required.");
            }
        }

        Require(failures, nameof(SmtpOptions.Host), options.Host);
        Require(failures, nameof(SmtpOptions.Username), options.Username);
        Require(failures, nameof(SmtpOptions.Password), options.Password);
        Require(failures, nameof(SmtpOptions.FromName), options.FromName);
        ValidateEmail(failures, nameof(SmtpOptions.FromEmail), options.FromEmail, required: true);
        ValidateEmail(failures, nameof(SmtpOptions.ReplyToEmail), options.ReplyToEmail);
        ValidateEmail(failures, nameof(SmtpOptions.BccEmail), options.BccEmail);

        if (options.Port is < 1 or > 65535)
        {
            failures.Add("Smtp:Port must be between 1 and 65535.");
        }

        if (options.Timeout <= 0)
        {
            failures.Add("Smtp:Timeout must be greater than 0.");
        }

        return failures.Count == 0
            ? ValidateOptionsResult.Success
            : ValidateOptionsResult.Fail(failures);
    }

    private static void ValidateEmail(List<string> errors, string key, string value, bool required = false)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            if (required)
            {
                errors.Add($"Smtp:{key} is required.");
            }

            return;
        }

        if (!EmailAddressValidator.IsValid(value))
        {
            errors.Add($"Smtp:{key} is not a valid email address.");
        }
    }
}
