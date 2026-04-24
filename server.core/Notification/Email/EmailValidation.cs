using System.ComponentModel.DataAnnotations;

namespace server.core.Notification;

internal static class EmailValidation
{
    public static void ValidateRecipients(EmailRecipients recipients)
    {
        ArgumentNullException.ThrowIfNull(recipients);
        Validator.ValidateObject(recipients, new ValidationContext(recipients), validateAllProperties: true);
    }

    public static void ValidateMessage(EmailMessage message)
    {
        ArgumentNullException.ThrowIfNull(message);
        ValidateRecipients(message.Recipients);

        if (string.IsNullOrWhiteSpace(message.Subject))
        {
            throw new ValidationException("Email subject is required.");
        }

        if (string.IsNullOrWhiteSpace(message.TextBody))
        {
            throw new ValidationException("Email text body is required.");
        }
    }
}
