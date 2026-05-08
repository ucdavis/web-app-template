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
    .max(50, 'First name must be 50 characters or fewer'),
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
