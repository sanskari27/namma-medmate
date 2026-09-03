import { Button, Label, Reveal } from '@atoms';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@molecules';
import { ApiError, isApiError } from '@/services/axios';
import {
  approveKycPack,
  kycDocumentUrl,
  listKycQueue,
  rejectKycPack,
  type KycPack,
} from '@/services/kyc';
import type { RootState } from '@/store';
import { Ban, BadgeCheck, FileSearch, Unplug } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useId, useRef, useState } from 'react';
import { useSelector } from 'react-redux';

type PageStatus = 'loading' | 'empty' | 'denied' | 'failure' | 'success' | null;
type DecisionStatus = 'empty' | 'validation' | 'loading' | 'denied' | 'conflict' | 'failure';

function canReview(role: string | undefined, modules: string[] | undefined): boolean {
  if (role === 'admin_super') {
    return true;
  }
  return Boolean(modules?.includes('TENANT_KYC'));
}

function statusCopy(status: PageStatus): { icon: typeof Ban; text: string } | null {
  switch (status) {
    case 'loading':
      return { icon: FileSearch, text: 'Loading tenant KYC dossiers…' };
    case 'empty':
      return { icon: FileSearch, text: 'No pharmacy KYC packs waiting on HQ.' };
    case 'denied':
      return { icon: Ban, text: 'Your desk cannot open the tenant KYC queue.' };
    case 'failure':
      return { icon: Unplug, text: 'Could not load the KYC queue. Try again.' };
    case 'success':
      return { icon: BadgeCheck, text: 'Decision filed. Pharmacy notified.' };
    default:
      return null;
  }
}

export default function KycQueueScreen() {
  const role = useSelector((s: RootState) => s.auth.user?.role);
  const modules = useSelector((s: RootState) => s.auth.user?.modules);
  const allowed = canReview(role, modules);
  const statusId = useId();
  const [items, setItems] = useState<KycPack[]>([]);
  const [status, setStatus] = useState<PageStatus>(allowed ? 'loading' : 'denied');
  const [selected, setSelected] = useState<KycPack | null>(null);
  const [decision, setDecision] = useState<'approve' | 'reject' | null>(null);
  const [reason, setReason] = useState('');
  const [decisionStatus, setDecisionStatus] = useState<DecisionStatus>('empty');
  const restoreRef = useRef<HTMLElement | null>(null);

  const load = useCallback(async () => {
    if (!allowed) {
      setStatus('denied');
      return;
    }
    setStatus('loading');
    try {
      const next = await listKycQueue();
      setItems(next);
      setStatus(next.length === 0 ? 'empty' : null);
    } catch (error) {
      if (isApiError(error) || error instanceof ApiError) {
        if (error.status === 403) {
          setStatus('denied');
          return;
        }
      }
      setStatus('failure');
    }
  }, [allowed]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (decision) {
      restoreRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setReason('');
      setDecisionStatus('empty');
    } else {
      restoreRef.current?.focus();
    }
  }, [decision]);

  const copy = statusCopy(status);
  const decisionMessage =
    decisionStatus === 'validation'
      ? 'Enter a rejection reason before filing.'
      : decisionStatus === 'denied'
        ? 'Your desk cannot decide this dossier.'
        : decisionStatus === 'conflict'
          ? 'This KYC pack was already decided.'
          : decisionStatus === 'failure'
            ? 'Could not file this decision. Try again.'
            : null;

  const onDecide = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected || !decision) {
      return;
    }
    if (decision === 'reject' && !reason.trim()) {
      setDecisionStatus('validation');
      return;
    }
    setDecisionStatus('loading');
    try {
      if (decision === 'approve') {
        await approveKycPack(selected.id);
      } else {
        await rejectKycPack(selected.id, reason.trim());
      }
      setDecision(null);
      setSelected(null);
      setStatus('success');
      const next = await listKycQueue();
      setItems(next);
      if (next.length === 0) {
        setStatus('success');
      }
    } catch (error) {
      if (isApiError(error) || error instanceof ApiError) {
        if (error.status === 409) {
          setDecisionStatus('conflict');
          return;
        }
        if (error.status === 403) {
          setDecisionStatus('denied');
          return;
        }
      }
      setDecisionStatus('failure');
    }
  };

  return (
    <Reveal className="space-y-5">
      <div className="border-b border-line pb-4">
        <h1 className="font-serif text-xl text-ink">Tenant KYC queue</h1>
        <p className="mt-1 text-sm text-muted">
          Open each pharmacy dossier, inspect evidence, then approve or reject with a reason.
        </p>
      </div>

      {copy && !decision ? (
        <p
          id={statusId}
          role="alert"
          className="flex items-start gap-2 border border-line bg-elevated px-3 py-2 text-sm text-ink"
        >
          <copy.icon className="mt-0.5 size-3.5 shrink-0 text-brand" aria-hidden="true" />
          <span>{copy.text}</span>
        </p>
      ) : null}

      {allowed ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <ol className="space-y-2">
            {items.map((row, index) => (
              <li key={row.id}>
                <button
                  type="button"
                  className={`flex w-full items-stretch border text-left ${
                    selected?.id === row.id
                      ? 'border-brand bg-elevated'
                      : 'border-line bg-surface'
                  }`}
                  onClick={() => setSelected(row)}
                  aria-pressed={selected?.id === row.id}
                >
                  <div className="flex w-10 shrink-0 flex-col items-center justify-center border-r border-line bg-elevated font-mono text-[11px] text-muted">
                    {String(index + 1).padStart(2, '0')}
                  </div>
                  <div className="min-w-0 flex-1 px-3 py-3">
                    <p className="text-sm text-ink">{row.tenantName}</p>
                    <p className="mt-1 truncate font-mono text-[11px] text-muted">{row.legalName}</p>
                    <p className="mt-1 font-mono text-[11px] text-brand">{row.drugLicenseNumber}</p>
                  </div>
                </button>
              </li>
            ))}
          </ol>

          <section
            aria-label="KYC dossier"
            className="border border-line bg-surface px-4 py-4"
          >
            {selected ? (
              <div className="space-y-4">
                <div>
                  <h2 className="font-serif text-lg text-ink">{selected.tenantName}</h2>
                  <p className="mt-1 text-sm text-muted">{selected.legalName}</p>
                </div>
                <dl className="grid gap-2 text-[12px] sm:grid-cols-2">
                  <div>
                    <dt className="text-muted">Drug licence</dt>
                    <dd className="font-mono text-ink">{selected.drugLicenseNumber}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">PAN</dt>
                    <dd className="font-mono text-ink">{selected.pan}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">GSTIN</dt>
                    <dd className="font-mono text-ink">{selected.gstin ?? 'Not provided'}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Phone</dt>
                    <dd className="text-ink">{selected.contactPhone}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-muted">Address</dt>
                    <dd className="text-ink">
                      {selected.addressLine1}, {selected.city}, {selected.state} {selected.pincode}
                    </dd>
                  </div>
                </dl>
                <ul className="space-y-2">
                  {selected.documents.map((doc) => (
                    <li key={doc.id} className="flex items-center justify-between gap-2 border border-line px-3 py-2">
                      <div>
                        <p className="text-sm text-ink">{doc.docType}</p>
                        <p className="font-mono text-[11px] text-muted">{doc.originalFilename}</p>
                      </div>
                      <a
                        className="text-sm text-brand underline"
                        href={kycDocumentUrl(selected.id, doc.id)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open evidence
                      </a>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" onClick={() => setDecision('approve')}>
                    Approve dossier
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setDecision('reject')}>
                    Reject with reason
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted">Select a dossier from the queue to inspect evidence.</p>
            )}
          </section>
        </div>
      ) : null}

      <Dialog open={decision !== null} onOpenChange={(open) => !open && setDecision(null)}>
        <DialogContent aria-describedby={undefined}>
          <DialogTitle>
            {decision === 'approve' ? 'Approve tenant KYC' : 'Reject tenant KYC'}
          </DialogTitle>
          <DialogDescription>
            {decision === 'approve'
              ? `Unlock ${selected?.tenantName ?? 'this pharmacy'} on Free plan.`
              : `Tell ${selected?.tenantName ?? 'the pharmacy'} what to correct before resubmit.`}
          </DialogDescription>
          {decisionMessage ? (
            <p role="alert" className="mt-3 text-sm text-ink">
              {decisionMessage}
            </p>
          ) : null}
          <form onSubmit={onDecide} className="mt-4 space-y-3" noValidate>
            {decision === 'reject' ? (
              <div className="space-y-1.5">
                <Label htmlFor="reject-reason">Rejection reason</Label>
                <textarea
                  id="reject-reason"
                  className="min-h-24 w-full border border-line bg-canvas px-3 py-2 text-sm text-ink"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                />
              </div>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDecision(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={decisionStatus === 'loading'}>
                {decisionStatus === 'loading'
                  ? 'Filing…'
                  : decision === 'approve'
                    ? 'Confirm approve'
                    : 'Confirm reject'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Reveal>
  );
}
