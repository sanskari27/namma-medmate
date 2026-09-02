import { Reveal, Button } from '@atoms';
import { ApiError, isApiError } from '@/services/axios';
import { deactivateOperator, listOperators, type HqOperator } from '@/services/staff';
import { Ban, ShieldAlert, ShieldCheck, Unplug } from 'lucide-react';
import { useCallback, useEffect, useId, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';
import { FileAgentDialog } from './components/file-agent-dialog';
import { OffboardOperatorDialog } from './components/offboard-operator-dialog';
import { OperatorFileMenu } from './components/operator-file-menu';

type PageStatus = 'loading' | 'empty' | 'denied' | 'failure' | 'success' | null;

function statusCopy(status: PageStatus): { icon: typeof Ban; text: string } | null {
  switch (status) {
    case 'loading':
      return { icon: ShieldAlert, text: 'Loading operators' };
    case 'empty':
      return { icon: ShieldAlert, text: 'No verification agents yet.' };
    case 'denied':
      return {
        icon: Ban,
        text: 'Only the HQ administrator can add verification agents.',
      };
    case 'failure':
      return { icon: Unplug, text: 'Could not load operators. Try again.' };
    case 'success':
      return {
        icon: ShieldCheck,
        text: 'Verification agent saved. Approve them under Staff approvals before they can sign in.',
      };
    default:
      return null;
  }
}

export default function OperatorsScreen() {
  const role = useSelector((s: RootState) => s.auth.user?.role);
  const master = role === 'admin_super';
  const statusId = useId();
  const [items, setItems] = useState<HqOperator[]>([]);
  const [status, setStatus] = useState<PageStatus>(master ? 'loading' : 'denied');
  const [banner, setBanner] = useState<string | null>(null);
  const [fileOpen, setFileOpen] = useState(false);
  const [offboardFor, setOffboardFor] = useState<HqOperator | null>(null);
  const [offboardBusy, setOffboardBusy] = useState(false);

  const load = useCallback(async () => {
    if (!master) {
      setStatus('denied');
      return;
    }
    setStatus('loading');
    try {
      const next = await listOperators();
      setItems(next);
      setStatus(next.some((row) => row.role === 'admin_verification') ? null : 'empty');
    } catch {
      setStatus('failure');
    }
  }, [master]);

  useEffect(() => {
    void load();
  }, [load]);

  const copy = banner ? { icon: ShieldCheck, text: banner } : statusCopy(status);
  const agents = items.filter((row) => row.role === 'admin_verification');
  const masters = items.filter((row) => row.role === 'admin_super');

  const onDeactivate = async () => {
    if (!offboardFor) {
      return;
    }
    setOffboardBusy(true);
    try {
      await deactivateOperator(offboardFor.id);
      setOffboardFor(null);
      setBanner('Access removed. Historical records remain.');
      const next = await listOperators();
      setItems(next);
      setStatus(next.some((row) => row.role === 'admin_verification') ? 'success' : 'empty');
    } catch (error) {
      if (isApiError(error) || error instanceof ApiError) {
        if (error.status === 409) {
          setOffboardFor(null);
          setBanner('Access has already been removed.');
          setStatus('success');
          return;
        }
        if (error.status === 403) {
          setStatus('denied');
          return;
        }
      }
      setStatus('failure');
    } finally {
      setOffboardBusy(false);
    }
  };

  return (
    <Reveal className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
        <div>
          <h1 className="font-serif text-xl text-ink">Operators</h1>
          <p className="mt-1 text-sm text-muted">
            Add verification agents who review pharmacy staff before those staff can sign in.
          </p>
        </div>
        {master ? (
          <Button type="button" onClick={() => setFileOpen(true)}>
            Add verification agent
          </Button>
        ) : null}
      </div>
      {copy && !fileOpen ? (
        <p
          id={statusId}
          role="alert"
          className="flex items-start gap-2 border border-line bg-elevated px-3 py-2 text-sm text-ink"
        >
          <copy.icon className="mt-0.5 size-3.5 shrink-0 text-brand" aria-hidden="true" />
          <span>{copy.text}</span>
        </p>
      ) : null}
      {master ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,14rem)_1fr]">
          <section className="border border-line bg-surface px-3 py-3">
            <p className="text-xs text-muted">Administrator</p>
            {masters.map((row) => (
              <div key={row.id} className="mt-2">
                <p className="font-serif text-base text-ink">{row.displayName}</p>
                <p className="font-mono text-[11px] text-muted">{row.email}</p>
                <p className="mt-1 text-xs text-ink">Active</p>
              </div>
            ))}
          </section>
          <section className="border border-line">
            <div className="flex items-center justify-between border-b border-line bg-elevated px-3 py-2">
              <p className="text-sm text-ink">Verification agents</p>
              <p className="text-xs text-muted">{agents.length} agents</p>
            </div>
            <ul className="divide-y divide-line">
              {agents.map((row) => (
                <li key={row.id} className="flex items-center gap-3 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink">{row.displayName}</p>
                    <p className="font-mono text-[11px] text-muted">{row.email}</p>
                  </div>
                  <p className="text-xs text-ink">
                    {row.status === 'PENDING' ? 'Pending approval' : 'Active'}
                  </p>
                  <OperatorFileMenu operator={row} onOffboard={() => setOffboardFor(row)} />
                </li>
              ))}
            </ul>
          </section>
          <FileAgentDialog
            open={fileOpen}
            onOpenChange={setFileOpen}
            onSuccess={async (message) => {
              setBanner(message);
              setStatus('success');
              const next = await listOperators();
              setItems(next);
            }}
          />
          {offboardFor ? (
            <OffboardOperatorDialog
              operator={offboardFor}
              open
              busy={offboardBusy}
              onOpenChange={(open) => {
                if (!open) {
                  setOffboardFor(null);
                }
              }}
              onConfirm={() => void onDeactivate()}
            />
          ) : null}
        </div>
      ) : null}
    </Reveal>
  );
}
