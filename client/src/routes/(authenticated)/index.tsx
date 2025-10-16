import { useUser } from '@/shared/auth/UserContext.tsx';
import { createFileRoute, Link } from '@tanstack/react-router';

export const Route = createFileRoute('/(authenticated)/')({
  component: RouteComponent,
});

function RouteComponent() {
  const user = useUser();
  return (
    <div className="min-h-screen bg-base-100">
      <div className="container mx-auto px-4 py-16">
        {/* Header Section */}
        <header className="text-center mb-16">
          <div className="mb-8">
            <img
              alt="App Logo"
              className="mx-auto"
              height={77}
              src="/caes.svg"
              width={419}
            />
          </div>

          {/* Hero Message */}
          <div className="mb-8">
            <h1 className="text-5xl font-bold mb-4">Hello {user.name}!</h1>
            <p className="text-xl max-w-2xl mx-auto text-base-content/70">
              Welcome to your modern app template. Built with Vite, React,
              TypeScript, and TanStack Router for rapid development.
            </p>
          </div>
        </header>

        {/* Sample Section */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">Sample Pages</h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="card bg-base-100 shadow-md">
              <div className="card-body">
                <h3 className="card-title">Data Table Fetch Example</h3>
                <p className="text-base-content/70">
                  This page demonstrates the DataTable component with sample
                  data and different data types, loaded from the backend API
                </p>
                <div className="card-actions justify-end">
                  <Link className="btn btn-primary" to="/fetch">
                    Go to Table Page
                  </Link>
                </div>
              </div>
            </div>
            <div className="card bg-base-100 shadow-md">
              <div className="card-body">
                <h3 className="card-title">Form Example</h3>
                <p className="text-base-content/70">
                  This page demonstrates custom form components with TanStack
                  Form, Zod validation, and real-time async validation.
                </p>
                <div className="card-actions justify-end">
                  <Link className="btn btn-primary" to="/form">
                    Go to Form Page
                  </Link>
                </div>
              </div>
            </div>
            <div className="card bg-base-100 shadow-md">
              <div className="card-body">
                <h3 className="card-title">Style Guide</h3>
                <p className="text-base-content/70">
                  Explore the design system and UI components available in this
                  template.
                </p>
                <div className="card-actions justify-end">
                  <Link className="btn btn-primary" to="/styles">
                    Go to Style Guide
                  </Link>
                </div>
              </div>
            </div>
            <div className="card bg-base-100 shadow-md">
              <div className="card-body">
                <h3 className="card-title">Anonymous About Page</h3>
                <p className="text-base-content/70">
                  This page is accessible without a login.
                </p>
                <div className="card-actions justify-end">
                  <Link className="btn btn-primary" to="/about">
                    Go to About Page
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-12">
            What is Included
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
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
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                    />
                  </svg>
                </div>
                <h3 className="card-title justify-center mb-2">
                  Fast & Modern
                </h3>
                <p className="text-base-content/70">
                  Built with Vite, React, TypeScript, and modern development
                  practices
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
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                    />
                  </svg>
                </div>
                <h3 className="card-title justify-center mb-2">
                  Type-Safe API
                </h3>
                <p className="text-base-content/70">
                  End-to-end type safety with ASP.NET Core and automatic API
                  validation
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
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                    />
                  </svg>
                </div>
                <h3 className="card-title justify-center mb-2">Secure Auth</h3>
                <p className="text-base-content/70">
                  Built-in authentication system with session management
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Getting Started Section */}
        <section className="text-center mb-16">
          <div className="card bg-base-200 shadow-xl max-w-2xl mx-auto">
            <div className="card-body">
              <h2 className="card-title text-2xl font-bold justify-center mb-4">
                Getting Started
              </h2>
              <p className="text-base-content/70 mb-6">
                Start building your own app with this template in just one
                command:
              </p>
              <div className="mockup-code mb-6">
                <pre data-prefix="$">
                  <code>
                    git clone https://github.com/ucdavis/web-app-template/
                    my-app
                  </code>
                </pre>
              </div>
              <p className="text-base-content/70 mb-8">
                This will scaffold a new project using this template, so you can
                get started quickly with all the best practices and tools
                already set up.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  className="btn btn-primary"
                  href="https://vitejs.dev/guide/"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  View Vite Documentation
                </a>
                <a
                  className="btn btn-outline"
                  href="https://github.com/ucdavis/web-app-template"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  View Source
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
