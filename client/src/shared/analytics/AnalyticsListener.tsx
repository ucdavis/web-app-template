import { useRouter } from '@tanstack/react-router';
import { useEffect } from 'react';

export function AnalyticsListener() {
  const router = useRouter();

  useEffect(() => {
    window.gtag?.('event', 'page_view', {
      page_path: window.location.pathname,
    });

    return router.subscribe('onResolved', () => {
      const path = window.location.pathname;

      window.gtag?.('event', 'page_view', {
        page_path: path,
      });
    });
  }, [router]);

  return null;
}
