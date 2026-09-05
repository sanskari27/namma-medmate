import { pingSalesInvoiceHealth } from '@/services/salesInvoices';
import { useCallback, useEffect, useState } from 'react';

export function usePosConnectivity() {
  const [offline, setOffline] = useState(
    () => typeof navigator !== 'undefined' && navigator.onLine === false,
  );

  const check = useCallback(async () => {
    if (typeof pingSalesInvoiceHealth !== 'function') {
      return;
    }
    try {
      const result = await pingSalesInvoiceHealth();
      if (result.status === 'UP') {
        setOffline(false);
        window.setTimeout(() => document.getElementById('pos-product-search')?.focus(), 0);
      } else {
        setOffline(true);
      }
    } catch {
      setOffline(true);
    }
  }, []);

  useEffect(() => {
    const onOffline = () => {
      setOffline(true);
    };
    const onOnline = () => {
      void check();
    };
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
    };
  }, [check]);

  useEffect(() => {
    if (!offline) {
      return;
    }
    const id = window.setInterval(() => {
      void check();
    }, 2000);
    return () => window.clearInterval(id);
  }, [offline, check]);

  return { offline };
}
