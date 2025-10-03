import { createFileRoute } from '@tanstack/react-router';
import { useMeQuery } from '../../queries/user.ts';

export const Route = createFileRoute('/(authenticated)/me')({
  component: RouteComponent,
});

function RouteComponent() {
  const meQuery = useMeQuery();

  return <div>Hello {meQuery.data?.name}!</div>;
}
