# Optional email notifications

Email is optional. Leave `Smtp:Host` empty when no SMTP service is configured; the app can start without email credentials.

## Reusable code

`AddNotificationServices(configuration)` registers SMTP options, `IEmailService`, and `INotificationRenderer`. It does not register sample message composition.

- `Email/` validates recipients and sends text/HTML messages through SMTP.
- `NotificationRenderer.cs` renders a Razor template and converts MJML to HTML.
- `server.core/Views/Shared/` contains the shared email layout and button templates.
- `NotificationTemplateModels.cs` contains the shared layout and button models.

Applications can compose their own messages by rendering a template with `INotificationRenderer`, then passing the resulting HTML and plain text to `IEmailService`.

## Examples

`server/Examples/Notifications/` contains the demo controller, request models, `SampleNotificationService`, example options, and default/table email templates. `AddNotificationExamples(configuration)` registers that composition separately. The `Notification` configuration section and existing `/api/notification/default` and `/api/notification/table` URLs remain the same. Sample endpoints are available only in Development and test.

The frontend demo lives in `client/src/examples/notifications/`. Its route remains `/notification`.

## Remove the examples and keep email support

1. Remove `server/Examples/Notifications/` and its `using` and `AddNotificationExamples` call from `server/Program.cs`.
2. Remove `client/src/examples/notifications/`, `client/src/routes/(authenticated)/notification.tsx`, and the notification link in the authenticated index page. Start Vite with `npm run dev` in `client/` once to regenerate the route tree before building.
3. Remove `tests/server.tests/Examples/Notifications/` and `client/src/test/routes/(authenticated)/notification.test.tsx`.
4. Remove sample `Notification` settings from appsettings and local environment files. Disable `NOTIFICATION_BASE_URL`, `NOTIFICATION_DEFAULT_APP_NAME`, and `NOTIFICATION_DEFAULT_BUTTON_TEXT` in `infrastructure/azure/deployment-settings.json`, then run `npm run deployment-settings:sync`.

Keep `AddNotificationServices`, the reusable core code, SMTP settings, and the tests under `tests/server.tests/Notification/`.

## Remove email entirely

After removing the examples:

1. Remove `server.core/Notification/`, `server.core/Views/Shared/`, and `tests/server.tests/Notification/`.
2. Remove the `Server.Core.Notification` import and `AddNotificationServices` call from `server/Program.cs`.
3. Remove MailKit, Mjml.Net, and Razor.Templating.Core from `server.core/server.core.csproj`. If the project has no other Razor templates, use `Microsoft.NET.Sdk` and remove `AddRazorSupportForMvc`.
4. Remove `Smtp` settings from appsettings and local environment files. Add all `SMTP_*` entries in the deployment defaults catalog to the overlay's `disabled` list and run `npm run deployment-settings:sync`.
5. Run the client build/tests and `dotnet test` before deploying. Use Configure Azure to apply runtime setting removals before the next package deployment.
