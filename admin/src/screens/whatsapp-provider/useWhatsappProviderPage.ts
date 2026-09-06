import { isApiError } from '@/services/axios';
import {
  listWhatsAppTemplates,
  syncWhatsAppProvider,
  type WhatsAppProvider,
  type WhatsAppStructure,
} from '@/services/whatsappTemplates';
import type { RootState } from '@/store';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { isMaster, matchesStructure, type PageStatus } from './WhatsappProviderScreen.utils';

export function useWhatsappProviderPage() {
  const role = useSelector((state: RootState) => state.auth.user?.role);
  const allowed = isMaster(role);
  const statusId = useId();
  const rescanRef = useRef<HTMLButtonElement | null>(null);

  const [status, setStatus] = useState<PageStatus>(allowed ? 'loading' : 'denied');
  const [structures, setStructures] = useState<WhatsAppStructure[]>([]);
  const [provider, setProvider] = useState<WhatsAppProvider | null>(null);
  const [uniqueQuery, setUniqueQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [busy, setBusy] = useState(false);

  const applyCatalogue = useCallback(
    (next: { provider: WhatsAppProvider; structures: WhatsAppStructure[] }, mode: 'initial' | 'rescan') => {
      setProvider(next.provider);
      setStructures(next.structures);
      if (mode === 'rescan') {
        setStatus('success');
        rescanRef.current?.focus();
        return;
      }
      setStatus(next.structures.length === 0 ? 'empty' : null);
    },
    [],
  );

  const load = useCallback(
    async (mode: 'initial' | 'rescan') => {
      if (!allowed) {
        setStatus('denied');
        return;
      }
      if (mode === 'initial') {
        setStatus('loading');
      }
      try {
        const next =
          mode === 'rescan' ? await syncWhatsAppProvider() : await listWhatsAppTemplates();
        applyCatalogue(next, mode);
      } catch (error) {
        if (isApiError(error) && (error.status === 403 || error.code === 'FORBIDDEN')) {
          setStatus('denied');
          return;
        }
        if (isApiError(error) && error.status === 409) {
          setStatus('conflict');
          return;
        }
        setStatus('failure');
      }
    },
    [allowed, applyCatalogue],
  );

  useEffect(() => {
    if (!allowed) {
      setStatus('denied');
      return;
    }
    void load('initial');
  }, [allowed, load]);

  function onIsolate() {
    if (!uniqueQuery.trim()) {
      setStatus('validation');
      return;
    }
    setAppliedQuery(uniqueQuery.trim());
    setStatus(null);
  }

  async function onRescan() {
    setBusy(true);
    try {
      await load('rescan');
    } finally {
      setBusy(false);
    }
  }

  const visible = structures.filter((row) => matchesStructure(row, appliedQuery));

  return {
    allowed,
    status,
    statusId,
    provider,
    items: visible,
    uniqueQuery,
    busy,
    rescanRef,
    setUniqueQuery,
    onIsolate,
    onRescan,
  };
}
