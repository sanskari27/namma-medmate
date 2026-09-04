import { Reveal } from '@atoms';
import {
  isApiError,
  listOutstandingCreditAccounts,
  type OutstandingCreditAccount,
} from '@/services/credit';
import type { RootState } from '@/store';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { CreditSettleDialog } from '@templates';
import { CreditDetailPanel } from './components/credit-detail-panel';
import { CreditListPanel } from './components/credit-list-panel';
import { CreditStatusBanner } from './components/credit-status-banner';
import { hasCrmAccess, type PageStatus } from './CreditScreen.utils';

export default function CreditScreen() {
  const user = useSelector((state: RootState) => state.auth.user);
  const allowed = hasCrmAccess(user?.modules);
  const statusId = useId();
  const settleRef = useRef<HTMLButtonElement | null>(null);
  const [status, setStatus] = useState<PageStatus>('loading');
  const [items, setItems] = useState<OutstandingCreditAccount[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [settleOpen, setSettleOpen] = useState(false);

  const load = useCallback(async () => {
    if (!allowed) {
      setStatus('denied');
      return;
    }
    setStatus('loading');
    try {
      const next = await listOutstandingCreditAccounts();
      setItems(next);
      setStatus(next.length === 0 ? 'empty' : null);
      setSelectedId((prev) =>
        prev && next.some((row) => row.customerId === prev) ? prev : (next[0]?.customerId ?? null),
      );
    } catch (error) {
      if (isApiError(error) && (error.status === 403 || error.code === 'FORBIDDEN')) {
        setStatus('denied');
      } else {
        setStatus('failure');
      }
    }
  }, [allowed]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = items.find((row) => row.customerId === selectedId) ?? null;

  return (
    <Reveal className="flex h-full min-h-0 w-full flex-col gap-4">
      <header className="shrink-0 space-y-1">
        <h1 className="font-sans text-lg font-semibold text-ink">Credit / Khata</h1>
        <p className="text-sm text-muted">
          Outstanding balances across the pharmacy. Settle without editing old bills.
        </p>
      </header>

      <CreditStatusBanner status={status} statusId={statusId} />

      {allowed && status !== 'denied' ? (
        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
          <CreditListPanel
            items={items}
            selectedId={selectedId}
            loading={status === 'loading'}
            onSelect={setSelectedId}
          />
          <CreditDetailPanel
            account={selected}
            settleButtonRef={settleRef}
            onSettle={() => setSettleOpen(true)}
          />
        </div>
      ) : null}

      {selected ? (
        <CreditSettleDialog
          open={settleOpen}
          customerId={selected.customerId}
          customerName={selected.customerName}
          balancePaise={selected.balancePaise}
          version={selected.version}
          onOpenChange={setSettleOpen}
          onCloseFocus={() => settleRef.current?.focus()}
          onSettled={() => {
            void load().then(() => setStatus('success'));
          }}
        />
      ) : null}
    </Reveal>
  );
}
