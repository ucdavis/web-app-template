using System.ComponentModel.DataAnnotations;

namespace Server.Core.Notification;

[AttributeUsage(AttributeTargets.Property | AttributeTargets.Field | AttributeTargets.Parameter, AllowMultiple = false)]
public sealed class EmailAddressListAttribute : ValidationAttribute
{
    private readonly bool _nonEmpty;
    private static readonly EmailAddressAttribute _emailAddressAttribute = new();

    public EmailAddressListAttribute(bool nonEmpty = false)
    {
        _nonEmpty = nonEmpty;
    }

    protected override ValidationResult? IsValid(object? value, ValidationContext validationContext)
    {
        if (value is null)
        {
            return _nonEmpty
                ? new ValidationResult($"'{validationContext.MemberName}' requires at least 1 email address.")
                : ValidationResult.Success;
        }

        if (value is not IEnumerable<string> emails)
        {
            return new ValidationResult($"'{validationContext.MemberName}' must be a list of email addresses.");
        }

        var materializedEmails = emails.ToArray();

        if (_nonEmpty && materializedEmails.Length == 0)
        {
            return new ValidationResult($"'{validationContext.MemberName}' requires at least 1 email address.");
        }

        foreach (var email in materializedEmails)
        {
            if (string.IsNullOrWhiteSpace(email) || !_emailAddressAttribute.IsValid(email))
            {
                return new ValidationResult($"'{validationContext.MemberName}' contains an invalid email address.");
            }
        }

        return ValidationResult.Success;
    }
}
