# Optional email notifications

Email is optional. Leave `Smtp:Host` empty when no SMTP service is configured; the app can start without email credentials.

## Configure local email

The [Docker sandbox](../../README.md#run-the-docker-sandbox) configures a local Mailpit inbox automatically. The settings below apply to development outside the sandbox.

To send sample email through Mailtrap or another SMTP test inbox, fill in the SMTP settings from [server/.env.example](../../server/.env.example) in `server/.env` or `server/.env.Development`. Replace the empty `Smtp__Host` entry when enabling delivery. The copied example overrides the Mailtrap host in `appsettings.Development.json`; editing that JSON file alone will not enable SMTP. See [configuration precedence](../../README.customization.md#4-secrets-connection-strings--environment-files).

Keep credentials in ignored environment files. [SmtpOptions and its validator](Email/SmtpOptions.cs) define the supported settings, defaults, and required values when a host is configured. The example file also lists the optional notification settings for application links, display name, and button text.

## Reusable code

`AddNotificationServices(configuration)` registers SMTP options, `IEmailService`, and `INotificationRenderer`. It does not register sample message composition.

- `Email/` validates recipients and sends text/HTML messages through SMTP.
- `NotificationRenderer.cs` renders a Razor template and converts MJML to HTML.
- `server.core/Views/Shared/` contains the shared email layout and button templates.
- `NotificationTemplateModels.cs` contains the shared layout and button models.

Applications can compose their own messages by rendering a template with `INotificationRenderer`, then passing the resulting HTML and plain text to `IEmailService`. Use [SampleNotificationService](../../server/Examples/Notifications/SampleNotificationService.cs) as the composition example.

## Examples

`server/Examples/Notifications/` contains the demo controller, request models, `SampleNotificationService`, example options, and default/table email templates. `AddNotificationExamples(configuration)` registers that composition separately. The `Notification` configuration section and existing `/api/notification/default` and `/api/notification/table` URLs remain the same. Sample endpoints are available only in Development and test.

The frontend demo lives in `client/src/examples/notifications/`. Its route remains `/notification`.

## Remove the examples and keep email support

1. Remove `server/Examples/Notifications/` and its `using` and `AddNotificationExamples` call from `server/Program.cs`.
2. Remove `client/src/examples/notifications/`, `client/src/routes/(authenticated)/notification.tsx`, and the notification link in the authenticated index page. Start Vite with `npm run dev` in `client/` once to regenerate the route tree before building.
3. Remove `tests/server.tests/Examples/Notifications/` and `client/src/test/routes/(authenticated)/notification.test.tsx`.
4. Remove sample `Notification` settings from appsettings and local environment files. Disable `NOTIFICATION_BASE_URL`, `NOTIFICATION_DEFAULT_APP_NAME`, and `NOTIFICATION_DEFAULT_BUTTON_TEXT` in `infrastructure/azure/deployment-settings.json`, then run `npm run deployment-settings:sync`.

Keep `AddNotificationServices`, the reusable core code, SMTP settings, and the tests under `tests/server.tests/Notification/`.

The Razor/MJML rendering tests use the sample templates and are removed with the example tests. Adapt those tests to your application's templates when replacing the examples. Run the client build/tests and `dotnet test` after removal, and use Configure Azure to apply disabled runtime settings before the next package deployment.

## Remove email entirely

After removing the examples:

1. Remove `server.core/Notification/`, `server.core/Views/Shared/`, and `tests/server.tests/Notification/`.
2. Remove the `Server.Core.Notification` import and `AddNotificationServices` call from `server/Program.cs`.
3. Remove MailKit, Mjml.Net, and Razor.Templating.Core from `server.core/server.core.csproj`. If the project has no other Razor templates, use `Microsoft.NET.Sdk` and remove `AddRazorSupportForMvc`.
4. Remove `Smtp` settings from appsettings and local environment files. Add all `SMTP_*` entries in the deployment defaults catalog to the overlay's `disabled` list and run `npm run deployment-settings:sync`.

Repeat the verification and runtime-setting cleanup described above after removing email support.
