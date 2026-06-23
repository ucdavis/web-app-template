import {
  createFileRoute,
  Outlet,
  type ErrorComponentProps,
} from '@tanstack/react-router';
import { HttpError } from '../../lib/api.ts';
import { RouterContext } from '../../main.tsx';
import { meQueryOptions } from '../../queries/user.ts';
import { UserProvider } from '@/shared/auth/UserContext.tsx';

export const Route = createFileRoute('/(authenticated)')({
  beforeLoad: async ({ context }: { context: RouterContext }) => {
    await context.queryClient.ensureQueryData(meQueryOptions());
  },
  component: () => (
    <UserProvider>
      <Outlet />
    </UserProvider>
  ),
  errorComponent: AuthenticatedRouteError,
});

function AuthenticatedRouteError({ error }: ErrorComponentProps<unknown>) {
  if (error instanceof HttpError && error.status === 403) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 py-12">
        <section className="max-w-lg text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Access unavailable
          </h1>
          <p className="mt-4 text-gray-600">
            You are signed in, but your account is not authorized to use this
            application.
          </p>
          <a className="btn btn-primary mt-6" href="/login">
            Sign in with a different account
          </a>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12">
      <section className="max-w-lg text-center">
        <h1 className="text-3xl font-bold text-gray-900">
          We could not load this page
        </h1>
        <p className="mt-4 text-gray-600">
          Refresh the page or try again later.
        </p>
      </section>
    </main>
  );
}
