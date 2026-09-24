import { createFileRoute } from '@tanstack/react-router';
import { NotificationExample } from '@/examples/notifications/NotificationExample.tsx';

export const Route = createFileRoute('/(authenticated)/notification')({
  component: NotificationExample,
});
