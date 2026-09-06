import { isApiError } from '@/services/axios';
import {
  listWhatsAppMessages,
  retryWhatsAppMessage,
  type WhatsAppMessage,
} from '@/services/whatsappMessages';
import type { RootState } from '@/store';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  apiStatusHint,
  hasCampaignAccess,
  mapApiStatus,
  type KindFilter,
  type PageStatus,
} from './WhatsappSendsScreen.utils';

export function useWhatsappSendsPage() {
  const user = useSelector((state: RootState) => state.auth.user);
  const statusId = useId();
  const retryRef = useRef<HTMLButtonElement | null>(null);
  const allowed = hasCampaignAccess(user?.role, user?.modules);

  const [status, setStatus] = useState<PageStatus>(allowed ? 'loading' : 'denied');
  const [statusHint, setStatusHint] = useState<string | null>(null);
  const [items, setItems] = useState<WhatsAppMessage[]>([]);
  const [queued, setQueued] = useState(0);
  const [sent, setSent] = useState(0);
  const [failed, setFailed] = useState(0);
  const [kind, setKind] = useState<KindFilter>('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const selected = items.find((row) => row.id === selectedId) ?? null;

  const load = useCallback(async () => {
    if (!allowed) {
      setStatus('denied');
      return;
    }
    setStatus('loading');
    setStatusHint(null);
    try {
      const page = await listWhatsAppMessages(kind === 'ALL' ? undefined : { kind });
      setItems(page.items);
      setQueued(page.queued);
      setSent(page.sent);
      setFailed(page.failed);
      setSelectedId((current) => current ?? page.items[0]?.id ?? null);
      setStatus(page.items.length === 0 ? 'empty' : null);
    } catch (error) {
      setStatus(isApiError(error) ? mapApiStatus(error) : 'failure');
    }
  }, [allowed, kind]);

  useEffect(() => {
    if (!allowed) {
      setStatus('denied');
      return;
    }
    void load();
  }, [allowed, load]);

  function selectMessage(id: string) {
    setSelectedId(id);
    setStatus(null);
    setStatusHint(null);
  }

  async function onRetry() {
    if (!selected) {
      setStatus('validation');
      setStatusHint(null);
      return;
    }
    if (selected.status !== 'FAILED') {
      setStatus('validation');
      setStatusHint('Only a failed send can be tried again from this counter.');
      return;
    }
    setBusy(true);
    try {
      const saved = await retryWhatsAppMessage(selected.id);
      setItems((prev) => prev.map((row) => (row.id === saved.id ? saved : row)));
      setSelectedId(saved.id);
      setStatus('success');
      setStatusHint(
        saved.status === 'SENT'
          ? 'This WhatsApp send went out from the counter.'
          : (apiStatusHint(saved.failureCode) ?? 'This send is still failed. Check the number or slots.'),
      );
      retryRef.current?.focus();
    } catch (error) {
      setStatus(isApiError(error) ? mapApiStatus(error) : 'failure');
      setStatusHint(isApiError(error) ? apiStatusHint(error.code) : null);
    } finally {
      setBusy(false);
    }
  }

  return {
    allowed,
    status,
    statusHint,
    statusId,
    items,
    queued,
    sent,
    failed,
    kind,
    selected,
    busy,
    retryRef,
    setKind,
    selectMessage,
    onRetry,
  };
}
