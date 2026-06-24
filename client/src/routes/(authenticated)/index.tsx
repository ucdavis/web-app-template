import { PeopleLookup } from './people-lookup.js';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/(authenticated)/')({
  component: PeopleLookup,
});

