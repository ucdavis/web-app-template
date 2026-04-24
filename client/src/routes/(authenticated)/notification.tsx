import { createFileRoute, Link } from '@tanstack/react-router';
import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';
import { HttpError, fetchJson } from '@/lib/api.ts';
import { useAppForm } from '@/shared/forms/formContext.tsx';
import { useUser } from '@/shared/auth/UserContext.tsx';

export const Route = createFileRoute('/(authenticated)/notification')({
  component: NotificationRoute,
});

type NotificationForm = {
  header: string;
  message: string;
  subject: string;
  to: string;
};

type NotificationResponse = {
  to: string;
};

const notificationSchema = z.object({
  header: z.string().min(1, 'Header is required'),
  message: z.string().min(1, 'Message is required'),
  subject: z.string().min(1, 'Subject is required'),
  to: z.union([
    z.literal(''),
    z.email('Please enter a valid email address'),
  ]),
}) satisfies z.ZodType<NotificationForm>;

function NotificationRoute() {
  const user = useUser();

  const sendNotificationMutation = useMutation({
    mutationFn: async (value: NotificationForm) =>
      fetchJson<NotificationResponse>('/api/notification/default', {
        body: JSON.stringify(value),
        method: 'POST',
      }),
  });

  const form = useAppForm({
    defaultValues: {
      header: 'Email notification is ready',
      message:
        'This notification shows how server.core can render a Razor template, convert MJML into responsive HTML, and send the final message through SMTP.',
      subject: 'Notification from your template app',
      to: '',
    },
    onSubmit: async ({ value }) => {
      try {
        await sendNotificationMutation.mutateAsync(value);
      } catch {
        // The mutation state already captures and renders API failures for the page.
      }
    },
    validators: {
      onChange: notificationSchema,
    },
  });

  const errorMessage = getErrorMessage(sendNotificationMutation.error);

  return (
    <div className="min-h-screen bg-base-100">
      <div className="absolute top-4 left-4 z-10">
        <Link className="btn btn-ghost btn-sm" to="/">
          Back Home
        </Link>
      </div>

      <div className="container mx-auto px-4 py-16">
        <header className="mx-auto mb-16 max-w-4xl text-center">
          <div className="badge badge-primary badge-outline mb-4">
            Notification
          </div>
          <h1 className="mb-4 text-5xl font-bold">
            Razor templates, MJML, and SMTP in one shared flow
          </h1>
          <p className="mx-auto max-w-3xl text-xl text-base-content/70">
            This page exercises the reusable email notification system that
            lives in <code>server.core</code>. The page keeps the request
            path easy to trace while showing where to add real templates and
            service-level notification logic in a new app.
          </p>
        </header>

        <section className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <article className="card bg-base-100 shadow-xl">
            <div className="card-body gap-8">
              <div>
                <h2 className="card-title text-2xl">
                  How the rendering pipeline works
                </h2>
                <p className="mt-2 text-base-content/70">
                  The shared notification pipeline separates template rendering,
                  MJML conversion, and SMTP delivery so feature-specific
                  services can focus on message composition.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="card bg-base-200 shadow-sm">
                  <div className="card-body">
                    <div className="badge badge-primary badge-outline">
                      1. Razor
                    </div>
                    <p className="text-sm text-base-content/70">
                      Templated markup starts in
                      <br />
                      <code>server.core/Views/Emails</code>.
                    </p>
                  </div>
                </div>

                <div className="card bg-base-200 shadow-sm">
                  <div className="card-body">
                    <div className="badge badge-primary badge-outline">
                      2. MJML
                    </div>
                    <p className="text-sm text-base-content/70">
                      The shared renderer transforms MJML into responsive HTML
                      before delivery.
                    </p>
                  </div>
                </div>

                <div className="card bg-base-200 shadow-sm">
                  <div className="card-body">
                    <div className="badge badge-primary badge-outline">
                      3. SMTP
                    </div>
                    <p className="text-sm text-base-content/70">
                      The SMTP sender delivers the message using the configured
                      Mailtrap or production server.
                    </p>
                  </div>
                </div>
              </div>

              <div className="card bg-base-200 shadow-sm">
                <div className="card-body">
                  <h3 className="card-title text-lg">Starter files to inspect</h3>
                  <div className="space-y-3 text-sm text-base-content/70">
                    <p>
                      Shared layout:
                      <br />
                      <code>server.core/Views/Shared/_NotificationLayout_mjml.cshtml</code>
                    </p>
                    <p>
                      Default template:
                      <br />
                      <code>
                        server.core/Views/Emails/DefaultNotification_mjml.cshtml
                      </code>
                    </p>
                    <p>
                      Shared services:
                      <br />
                      <code>server.core/Notification</code>
                    </p>
                  </div>
                </div>
              </div>

              <div className="alert alert-info">
                <span>
                  This template expects local SMTP testing to flow through
                  Mailtrap. Leave the recipient blank to send to your signed-in
                  account, or enter another test inbox address.
                </span>
              </div>
            </div>
          </article>

          <article className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title text-2xl">Send a notification email</h2>
              <p className="text-base-content/70">
                The API route is development-only. If the recipient field stays
                empty, the backend falls back to your current sign-in.
              </p>
              <div className="alert alert-info mt-2">
                <span>
                  Current user:
                  <span className="ml-2 badge badge-outline">
                    {user.email || 'no email claim found'}
                  </span>
                </span>
              </div>

              <form
                className="mt-6"
                onSubmit={(event) => {
                  event.preventDefault();
                  sendNotificationMutation.reset();
                  form.handleSubmit();
                }}
              >
                <form.AppForm>
                  <div className="space-y-6">
                    <form.AppField name="to">
                      {(field) => (
                        <field.TextField
                          label="Recipient Override"
                          placeholder="Leave blank to use the current user"
                        />
                      )}
                    </form.AppField>

                    <form.AppField name="subject">
                      {(field) => <field.TextField label="Subject" />}
                    </form.AppField>

                    <form.AppField name="header">
                      {(field) => <field.TextField label="Email Header" />}
                    </form.AppField>

                    <form.AppField name="message">
                      {(field) => {
                        const hasError =
                          field.state.meta.isTouched &&
                          !field.state.meta.isValid;

                        return (
                          <fieldset className="fieldset">
                            <legend className="fieldset-legend">Message</legend>
                            <textarea
                              className={`textarea textarea-bordered min-h-36 w-full ${
                                hasError ? 'textarea-error' : ''
                              }`}
                              onChange={(event) =>
                                field.handleChange(event.target.value)
                              }
                              placeholder="Write the body of the notification email"
                              value={field.state.value}
                            />
                            {hasError ? (
                              <p className="label text-error">
                                {field.state.meta.errors
                                  .map((error) => error?.message)
                                  .filter(Boolean)
                                  .join(', ')}
                              </p>
                            ) : (
                              <p className="label text-base-content/60">
                                Keep this brief and focused while you validate
                                the template output.
                              </p>
                            )}
                          </fieldset>
                        );
                      }}
                    </form.AppField>

                    <form.SubscribeButton label="Send Notification Email" />
                  </div>
                </form.AppForm>
              </form>

              {sendNotificationMutation.isSuccess ? (
                <div className="alert alert-success mt-6">
                  <span>
                    Notification email queued for{' '}
                    <strong>{sendNotificationMutation.data.to}</strong>.
                  </span>
                </div>
              ) : null}

              {errorMessage ? (
                <div className="alert alert-error mt-6">
                  <span>{errorMessage}</span>
                </div>
              ) : null}
            </div>
          </article>
        </section>
      </div>
    </div>
  );
}

function getErrorMessage(error: unknown) {
  if (error instanceof HttpError) {
    if (typeof error.body === 'string' && error.body.trim().length > 0) {
      return error.body;
    }

    return `Request failed with status ${error.status}.`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return '';
}
