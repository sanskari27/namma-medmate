import { pingSalesInvoiceHealth } from '@/services/salesInvoices';
import { useCallback, useEffect, useRef, useState } from 'react';
import { POS_SEARCH_INPUT_ID } from './PosScreen.utils';

export function usePosConnectivity() {
  const [offline, setOffline] = useState(
    () => typeof navigator !== 'undefined' && navigator.onLine === false,
  );
  const offlineRef = useRef(offline);
  offlineRef.current = offline;

  const check = useCallback(async () => {
    if (typeof pingSalesInvoiceHealth !== 'function') {
      return;
    }
    try {
      const result = await pingSalesInvoiceHealth();
      if (result.status === 'UP') {
        if (offlineRef.current) {
          window.setTimeout(() => document.getElementById(POS_SEARCH_INPUT_ID)?.focus(), 0);
        }
        setOffline(false);
      } else {
        setOffline(true);
      }
    } catch {
      setOffline(true);
    }
  }, []);

  useEffect(() => {
    void check();
    const id = window.setInterval(() => {
      void check();
    }, 2000);
    const onOffline = () => {
      setOffline(true);
    };
    const onOnline = () => {
      void check();
    };
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
    };
  }, [check]);

  return { offline };
}
