import { createFileRoute } from '@tanstack/react-router';

import { useAppForm } from '@/shared/forms/formContext.tsx';
import { z } from 'zod';
import { Link } from '@tanstack/react-router';

export const Route = createFileRoute('/(authenticated)/form')({
  component: FormComponent,
});

// Let's pretend we have a person type somewhere and we want to create a contact form for them
type Person = {
  email: string;
  firstName: string;
  lastName: string;
  role: 'Admin' | 'User' | 'Guest';
};

const availableRoles: Person['role'][] = ['Admin', 'User', 'Guest'];

/**
 * Zod schema for form validation, built from the Person type
 */
const contactFormSchema = z.object({
  email: z
    .email('Please enter a valid email address')
    .min(1, 'Email is required'),
  firstName: z
    .string()
    .min(1, 'First name is required')
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must be less than 50 characters')
    .refine((value) => value !== 'error', 'Cannot use "error" as first name'),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must be less than 50 characters'),
  role: z.enum(availableRoles, 'Please select a valid role'),
}) satisfies z.ZodType<Person>; // satisfies is option here but fun for type safety

/**
 * Form sample page demonstrating the custom form components with TanStack Form
 */
function FormComponent() {
  const form = useAppForm({
    defaultValues: {
      email: '',
      firstName: 'John',
      lastName: 'Doe',
      role: '',
    },
    onSubmit: async ({ value }) => {
      // only called if the form is valid
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));
      alert(
        `Form submitted successfully!\n\nData: ${JSON.stringify(value, null, 2)}`
      );
    },
    validators: {
      onChange: contactFormSchema,
    },
  });

  return (
    <div className="min-h-screen bg-base-100">
      {/* Homepage Link */}
      <div className="absolute top-4 left-4 z-10">
        <Link className="btn btn-ghost btn-sm" to="/">
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </svg>
          Home
        </Link>
      </div>

      <div className="container mx-auto px-4 py-16">
        {/* Header Section */}
        <header className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4">Form Example</h1>
          <p className="text-xl max-w-2xl mx-auto text-base-content/70">
            This page demonstrates our custom form components built with
            TanStack Form and Zod validation. The form includes real-time
            validation, async validation, loading states, and modern styling
            with DaisyUI.
          </p>
        </header>

        {/* Form Section */}
        <section className="mb-16">
          <div className="max-w-2xl mx-auto">
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title text-2xl mb-6">Contact Form</h2>
                <p className="text-base-content/70 mb-6">
                  Fill out the form below to see the custom form components with
                  Zod validation in action. Try submitting to see the loading
                  state and validation errors.
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    form.handleSubmit();
                  }}
                >
                  <form.AppForm>
                    <div className="space-y-6">
                      <form.AppField
                        name="firstName"
                        validators={{
                          onChangeAsync: z.string().refine(
                            async (value) => {
                              // Simulate API call to check if name is available
                              await new Promise((resolve) =>
                                setTimeout(resolve, 1000)
                              );
                              return value.toLowerCase() !== 'admin';
                            },
                            {
                              message: 'This name is not available',
                            }
                          ),
                          onChangeAsyncDebounceMs: 500,
                        }}
                      >
                        {(f) => <f.TextField label="First Name" />}
                      </form.AppField>

                      {/* Last Name Field */}
                      <form.AppField name="lastName">
                        {(f) => <f.TextField label="Last Name" />}
                      </form.AppField>

                      {/* Email Field */}
                      <form.AppField name="email">
                        {(f) => (
                          <f.TextField
                            label="Email Address"
                            placeholder="Enter your email address"
                          />
                        )}
                      </form.AppField>

                      {/* Role Selection */}
                      <form.AppField name="role">
                        {(f) => (
                          <f.SelectField
                            label="Role"
                            options={availableRoles.map((role) => ({
                              label:
                                role.charAt(0).toUpperCase() + role.slice(1), // uppercase first letter
                              value: role,
                            }))}
                            placeholder="Select your role"
                          />
                        )}
                      </form.AppField>

                      {/* Submit Button */}
                      <form.SubscribeButton label="Submit" />
                    </div>
                  </form.AppForm>
                </form>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">
            Form Features
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="card bg-base-100 shadow-md text-center">
              <div className="card-body">
                <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-6 h-6 text-primary"
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
                <h3 className="card-title justify-center mb-2">
                  Zod Validation
                </h3>
                <p className="text-base-content/70">
                  Schema-based validation with Zod for type-safe, declarative
                  validation rules
                </p>
              </div>
            </div>

            <div className="card bg-base-100 shadow-md text-center">
              <div className="card-body">
                <div className="w-12 h-12 bg-success/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-6 h-6 text-success"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                    />
                  </svg>
                </div>
                <h3 className="card-title justify-center mb-2">
                  Loading States
                </h3>
                <p className="text-base-content/70">
                  Beautiful loading indicators during form submission
                </p>
              </div>
            </div>

            <div className="card bg-base-100 shadow-md text-center">
              <div className="card-body">
                <div className="w-12 h-12 bg-secondary/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-6 h-6 text-secondary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                    />
                  </svg>
                </div>
                <h3 className="card-title justify-center mb-2">Type Safe</h3>
                <p className="text-base-content/70">
                  Full TypeScript support with type-safe form handling
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Examples Section */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">
            Try These Examples
          </h2>
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="card bg-base-100 shadow-md">
                <div className="card-body">
                  <h3 className="card-title mb-4">Zod Validation Testing</h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center">
                      <span className="text-primary mr-2">•</span>
                      Leave fields empty to see required validation
                    </li>
                    <li className="flex items-center">
                      <span className="text-primary mr-2">•</span>
                      Enter &quot;error&quot; in first name (blocked by schema)
                    </li>
                    <li className="flex items-center">
                      <span className="text-primary mr-2">•</span>
                      Enter &quot;admin&quot; in first name for async validation
                    </li>
                    <li className="flex items-center">
                      <span className="text-primary mr-2">•</span>
                      Enter invalid email format
                    </li>
                    <li className="flex items-center">
                      <span className="text-primary mr-2">•</span>
                      Try single character names (min length validation)
                    </li>
                  </ul>
                </div>
              </div>

              <div className="card bg-base-100 shadow-md">
                <div className="card-body">
                  <h3 className="card-title mb-4">Form Behavior</h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center">
                      <span className="text-success mr-2">•</span>
                      Form starts with default values
                    </li>
                    <li className="flex items-center">
                      <span className="text-success mr-2">•</span>
                      Submission shows loading state
                    </li>
                    <li className="flex items-center">
                      <span className="text-success mr-2">•</span>
                      Data is logged to console
                    </li>
                    <li className="flex items-center">
                      <span className="text-success mr-2">•</span>
                      Success message shows form data
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
