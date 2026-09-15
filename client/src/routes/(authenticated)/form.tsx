import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { z } from 'zod';
import { useAppForm } from '@/shared/forms/formContext.tsx';

export const Route = createFileRoute('/(authenticated)/form')({
  component: FormRoute,
});

const availableRoles = ['Admin', 'User', 'Guest'] as const;
const requestTypes = ['Consultation', 'Bug report', 'Feature request'] as const;

type ContactProfile = {
  email: string;
  firstName: string;
  lastName: string;
  role: (typeof availableRoles)[number];
};

type ProjectRequest = {
  acceptedTerms: boolean;
  details: string;
  ownerEmail: string;
  projectName: string;
  requestType: (typeof requestTypes)[number];
};

const contactProfileSchema = z.object({
  email: z
    .email('Enter a valid email address')
    .min(1, 'Email is required'),
  firstName: z
    .string()
    .trim()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must be 50 characters or fewer')
    .refine((value) => value.toLowerCase() !== 'error', {
      message: 'First name cannot be "error"',
    }),
  lastName: z
    .string()
    .trim()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must be 50 characters or fewer'),
  role: z.enum(availableRoles, 'Select a role'),
}) satisfies z.ZodType<ContactProfile>;

const projectRequestSchema = z.object({
  acceptedTerms: z
    .boolean()
    .refine((value) => value, 'Confirm the request is ready to send'),
  details: z
    .string()
    .trim()
    .min(20, 'Describe the request in at least 20 characters')
    .max(500, 'Details must be 500 characters or fewer'),
  ownerEmail: z.email('Enter a valid owner email address'),
  projectName: z
    .string()
    .trim()
    .min(3, 'Project name must be at least 3 characters')
    .max(80, 'Project name must be 80 characters or fewer'),
  requestType: z.enum(requestTypes, 'Select a request type'),
}) satisfies z.ZodType<ProjectRequest>;

const contactDefaultValues: ContactProfile = {
  email: '',
  firstName: '',
  lastName: '',
  role: 'User',
};

const projectDefaultValues: ProjectRequest = {
  acceptedTerms: false,
  details: '',
  ownerEmail: '',
  projectName: '',
  requestType: 'Feature request',
};

function FormRoute() {
  const [contactSubmission, setContactSubmission] =
    useState<ContactProfile | null>(null);
  const [projectSubmission, setProjectSubmission] =
    useState<ProjectRequest | null>(null);

  const contactForm = useAppForm({
    defaultValues: contactDefaultValues,
    onSubmit: ({ value }) => {
      setContactSubmission(value);
    },
    validators: {
      onChange: contactProfileSchema,
      onSubmit: contactProfileSchema,
    },
  });

  const projectForm = useAppForm({
    defaultValues: projectDefaultValues,
    onSubmit: ({ value }) => {
      setProjectSubmission(value);
    },
    validators: {
      onChange: projectRequestSchema,
      onSubmit: projectRequestSchema,
    },
  });

  return (
    <div className="min-h-screen bg-base-100">
      <div className="absolute top-4 left-4 z-10">
        <Link className="btn btn-ghost btn-sm" to="/">
          Back Home
        </Link>
      </div>

      <main className="container mx-auto px-4 py-16">
        <header className="mx-auto mb-12 max-w-4xl text-center">
          <div className="badge badge-primary badge-outline mb-4">
            Forms
          </div>
          <h1 className="mb-4 text-5xl font-bold">
            TanStack Form with Zod validation
          </h1>
          <p className="mx-auto max-w-3xl text-xl text-base-content/70">
            Use TanStack Form for field state and submission flow, and keep
            field rules in Zod schemas that also document the request shape.
          </p>
        </header>

        <section className="grid gap-8 lg:grid-cols-2">
          <article className="card bg-base-100 shadow-xl">
            <div className="card-body gap-6">
              <div>
                <h2 className="card-title text-2xl">Contact Profile</h2>
                <p className="mt-2 text-base-content/70">
                  This schema covers common text, email, and enum fields for a
                  user profile or lightweight contact request.
                </p>
              </div>

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  contactForm.handleSubmit();
                }}
              >
                <contactForm.AppForm>
                  <div className="space-y-5">
                    <div className="grid gap-5 sm:grid-cols-2">
                      <contactForm.AppField name="firstName">
                        {(field) => <field.TextField label="First Name" />}
                      </contactForm.AppField>

                      <contactForm.AppField name="lastName">
                        {(field) => <field.TextField label="Last Name" />}
                      </contactForm.AppField>
                    </div>

                    <contactForm.AppField name="email">
                      {(field) => (
                        <field.TextField
                          label="Email Address"
                          placeholder="person@example.edu"
                          type="email"
                        />
                      )}
                    </contactForm.AppField>

                    <contactForm.AppField name="role">
                      {(field) => (
                        <field.SelectField
                          label="Role"
                          options={availableRoles.map((role) => ({
                            label: role,
                            value: role,
                          }))}
                        />
                      )}
                    </contactForm.AppField>

                    <contactForm.SubscribeButton label="Save Contact Profile" />
                  </div>
                </contactForm.AppForm>
              </form>

              <SubmissionPreview
                data={contactSubmission}
                emptyText="No contact profile saved yet."
                title="Latest Contact Payload"
              />
            </div>
          </article>

          <article className="card bg-base-100 shadow-xl">
            <div className="card-body gap-6">
              <div>
                <h2 className="card-title text-2xl">Project Request</h2>
                <p className="mt-2 text-base-content/70">
                  This example adds a textarea, checkbox refinement, and another
                  enum to model a request body before it reaches an API route.
                </p>
              </div>

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  projectForm.handleSubmit();
                }}
              >
                <projectForm.AppForm>
                  <div className="space-y-5">
                    <projectForm.AppField name="projectName">
                      {(field) => (
                        <field.TextField
                          label="Project Name"
                          placeholder="Research portal refresh"
                        />
                      )}
                    </projectForm.AppField>

                    <projectForm.AppField name="ownerEmail">
                      {(field) => (
                        <field.TextField
                          label="Owner Email"
                          placeholder="owner@example.edu"
                          type="email"
                        />
                      )}
                    </projectForm.AppField>

                    <projectForm.AppField name="requestType">
                      {(field) => (
                        <field.SelectField
                          label="Request Type"
                          options={requestTypes.map((requestType) => ({
                            label: requestType,
                            value: requestType,
                          }))}
                        />
                      )}
                    </projectForm.AppField>

                    <projectForm.AppField name="details">
                      {(field) => (
                        <field.TextAreaField
                          hint="Include the user goal, known constraints, and expected outcome."
                          label="Details"
                          placeholder="The team needs..."
                        />
                      )}
                    </projectForm.AppField>

                    <projectForm.AppField name="acceptedTerms">
                      {(field) => (
                        <field.CheckboxField
                          description="This keeps accidental submissions out of the sample workflow."
                          label="I have reviewed the request details"
                        />
                      )}
                    </projectForm.AppField>

                    <projectForm.SubscribeButton label="Submit Project Request" />
                  </div>
                </projectForm.AppForm>
              </form>

              <SubmissionPreview
                data={projectSubmission}
                emptyText="No project request submitted yet."
                title="Latest Project Payload"
              />
            </div>
          </article>
        </section>

        <section className="mt-16">
          <h2 className="mb-12 text-center text-3xl font-bold">
            Form Features
          </h2>
          <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
            <article className="card bg-base-100 text-center shadow-md">
              <div className="card-body">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/20">
                  <svg
                    className="h-6 w-6 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                    />
                  </svg>
                </div>
                <h3 className="card-title justify-center">
                  Zod Validation
                </h3>
                <p className="text-base-content/70">
                  Schema-based validation keeps required fields, email checks,
                  enum values, and custom refine rules in one readable place.
                </p>
              </div>
            </article>

            <article className="card bg-base-100 text-center shadow-md">
              <div className="card-body">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-success/20">
                  <svg
                    className="h-6 w-6 text-success"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M4 6h16M4 12h16M4 18h7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                    />
                  </svg>
                </div>
                <h3 className="card-title justify-center">
                  Reusable Fields
                </h3>
                <p className="text-base-content/70">
                  Shared text, select, textarea, checkbox, and submit controls
                  keep form markup compact while preserving DaisyUI styling.
                </p>
              </div>
            </article>

            <article className="card bg-base-100 text-center shadow-md">
              <div className="card-body">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-secondary/20">
                  <svg
                    className="h-6 w-6 text-secondary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M12 6v12m6-6H6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                    />
                  </svg>
                </div>
                <h3 className="card-title justify-center">Type Safe</h3>
                <p className="text-base-content/70">
                  Default values, route code, and submit payloads use the same
                  TypeScript models that the Zod schemas validate.
                </p>
              </div>
            </article>
          </div>
        </section>

        <section className="mt-16 mb-16">
          <h2 className="mb-12 text-center text-3xl font-bold">
            Try These Examples
          </h2>
          <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-2">
            <article className="card bg-base-100 shadow-md">
              <div className="card-body">
                <h3 className="card-title mb-4">Zod Validation Testing</h3>
                <ul className="list-disc space-y-2 pl-5 text-sm text-base-content/70">
                  <li>Leave fields empty to see required validation.</li>
                  <li>
                    Enter <code>error</code> in first name to test the custom
                    Zod <code>refine</code> rule.
                  </li>
                  <li>Enter an invalid email format in either form.</li>
                  <li>Try single-character names to see min-length validation.</li>
                  <li>
                    Submit the project request without checking the confirmation
                    box to test a boolean refinement.
                  </li>
                </ul>
              </div>
            </article>

            <article className="card bg-base-100 shadow-md">
              <div className="card-body">
                <h3 className="card-title mb-4">Form Behavior</h3>
                <ul className="list-disc space-y-2 pl-5 text-sm text-base-content/70">
                  <li>
                    Both forms validate as you edit and again when you submit.
                  </li>
                  <li>
                    Valid submissions render the latest typed payload below the
                    form.
                  </li>
                  <li>
                    Repeated schema messages are deduped before they are shown.
                  </li>
                  <li>
                    The project request shows how textarea and checkbox fields
                    fit the same shared form pattern.
                  </li>
                  <li>
                    Any real API endpoint should still validate the same rules
                    on the ASP.NET Core side.
                  </li>
                </ul>
              </div>
            </article>
          </div>
        </section>
      </main>
    </div>
  );
}

interface SubmissionPreviewProps {
  data: unknown;
  emptyText: string;
  title: string;
}

function SubmissionPreview({ data, emptyText, title }: SubmissionPreviewProps) {
  return (
    <div className="rounded-lg bg-base-200 p-4">
      <h3 className="mb-3 font-semibold">{title}</h3>
      {data ? (
        <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded bg-base-300 p-4 text-sm">
          {JSON.stringify(data, null, 2)}
        </pre>
      ) : (
        <p className="text-sm text-base-content/60">{emptyText}</p>
      )}
    </div>
  );
}
