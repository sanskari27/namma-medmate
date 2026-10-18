import { Reveal } from '@atoms';
import { isApiError } from '@/services/axios';
import { listWaitlist, type WaitlistSignup } from '@/services/waitlist';
import type { RootState } from '@/store';
import { useCallback, useEffect, useId, useState } from 'react';
import { useSelector } from 'react-redux';
import { WaitlistHeader } from './components/waitlist-header';
import { WaitlistStatus } from './components/waitlist-status';
import { WaitlistTable } from './components/waitlist-table';
import { matchesQuery, type PageStatus } from './WaitlistScreen.utils';

export default function WaitlistScreen() {
  const role = useSelector((s: RootState) => s.auth.user?.role);
  const master = role === 'admin_super';
  const statusId = useId();
  const findId = useId();
  const [rows, setRows] = useState<WaitlistSignup[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<PageStatus>(master ? 'loading' : 'denied');

  const load = useCallback(async () => {
    if (!master) {
      setStatus('denied');
      setRows([]);
      return;
    }
    setStatus('loading');
    try {
      const next = await listWaitlist();
      setRows(next);
      setStatus(next.length === 0 ? 'empty' : null);
    } catch (err) {
      setRows([]);
      if (isApiError(err) && (err.code === 'FORBIDDEN' || err.status === 403)) {
        setStatus('denied');
        return;
      }
      setStatus('failure');
    }
  }, [master]);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = rows.filter((row) => matchesQuery(row, query));

  return (
    <Reveal className="flex flex-col gap-4 p-4">
      <WaitlistHeader />
      <WaitlistStatus statusId={statusId} status={status} onRetry={() => void load()} />
      {rows.length > 0 ? (
        <WaitlistTable rows={visible} query={query} findId={findId} onQuery={setQuery} />
      ) : null}
    </Reveal>
  );
}
