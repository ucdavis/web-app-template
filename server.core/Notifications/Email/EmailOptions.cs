using Microsoft.Extensions.Options;

namespace server.core.Notifications;

public sealed class EmailOptions
{
    public string Host { get; init; } = string.Empty;
    public int Port { get; init; } = 587;
    public bool UseSsl { get; init; } = true;
    public string Username { get; init; } = string.Empty;
    public string Password { get; init; } = string.Empty;
    public string FromEmail { get; init; } = string.Empty;
    public string FromName { get; init; } = string.Empty;
    public string BaseUrl { get; init; } = string.Empty;
    public string ReplyToEmail { get; init; } = string.Empty;
    public string BccEmail { get; init; } = string.Empty;
}

public sealed class EmailOptionsValidator : IValidateOptions<EmailOptions>
{
    public ValidateOptionsResult Validate(string? name, EmailOptions options)
    {
        ArgumentNullException.ThrowIfNull(options);

        var failures = new List<string>();

        static void Require(List<string> errors, string key, string value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                errors.Add($"Email:{key} is required.");
            }
        }

        Require(failures, nameof(EmailOptions.Host), options.Host);
        Require(failures, nameof(EmailOptions.Username), options.Username);
        Require(failures, nameof(EmailOptions.Password), options.Password);
        Require(failures, nameof(EmailOptions.FromEmail), options.FromEmail);
        Require(failures, nameof(EmailOptions.FromName), options.FromName);

        if (options.Port <= 0)
        {
            failures.Add("Email:Port must be greater than 0.");
        }

        return failures.Count == 0
            ? ValidateOptionsResult.Success
            : ValidateOptionsResult.Fail(failures);
    }
}
