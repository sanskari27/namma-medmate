import { Button, Input, Label, Reveal } from '@atoms';
import { ROUTES } from '@/libs/constants/routes.const';
import {
  cancelKioskTicket,
  closeKiosk,
  createKioskTicket,
  getKiosk,
  isApiError,
  openKiosk,
  type KioskState,
} from '@/services/kiosk';
import type { RootState } from '@/store';
import { AlertCircle, BadgeCheck, MonitorSmartphone, Unplug } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useId, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';

type PageStatus =
  | 'loading'
  | 'empty'
  | 'validation'
  | 'denied'
  | 'conflict'
  | 'failure'
  | 'success'
  | 'quota'
  | 'retail'
  | null;

function statusCopy(status: PageStatus): { icon: typeof AlertCircle; text: string } | null {
  switch (status) {
    case 'loading':
      return { icon: MonitorSmartphone, text: 'Loading this outlet’s kiosk…' };
    case 'empty':
      return {
        icon: MonitorSmartphone,
        text: 'Pick an outlet on this till, then open the self-order kiosk for walk-ins.',
      };
    case 'validation':
      return {
        icon: AlertCircle,
        text: 'Write what the walk-in needs before printing a pickup token.',
      };
    case 'denied':
      return {
        icon: AlertCircle,
        text: 'This till login cannot run the self-order kiosk. Ask the owner to grant the kiosk area.',
      };
    case 'conflict':
      return {
        icon: AlertCircle,
        text: 'Kiosk state changed on another till. Refresh and try again.',
      };
    case 'failure':
      return {
        icon: Unplug,
        text: 'Could not reach the server for this outlet’s kiosk. Try again.',
      };
    case 'success':
      return {
        icon: BadgeCheck,
        text: 'Pickup token ready. Hand the counter the token number when they collect.',
      };
    case 'quota':
      return {
        icon: AlertCircle,
        text: 'Self-order kiosk is on the Pro plan. Upgrade this pharmacy to open the kiosk.',
      };
    case 'retail':
      return {
        icon: AlertCircle,
        text: 'This outlet is Retail. Switch to a Kiosk outlet to run self-order.',
      };
    default:
      return null;
  }
}

export default function KioskScreen() {
  const user = useSelector((state: RootState) => state.auth.user);
  const activeBranchId = user?.activeBranchId ?? null;
  const hasModule = user?.modules?.includes('KIOSK') ?? false;
  const formId = useId();
  const [status, setStatus] = useState<PageStatus>('loading');
  const [state, setState] = useState<KioskState | null>(null);
  const [walkInName, setWalkInName] = useState('');
  const [pickupRequest, setPickupRequest] = useState('');
  const [lastToken, setLastToken] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [customerMode, setCustomerMode] = useState(false);

  const applyState = useCallback((next: KioskState, nextStatus: PageStatus = null) => {
    setState(next);
    if (nextStatus) {
      setStatus(nextStatus);
      return;
    }
    if (!next.hasModule) {
      setStatus('denied');
      return;
    }
    if (next.blockReason === 'NO_ACTIVE_BRANCH') {
      setStatus('empty');
      return;
    }
    if (next.blockReason === 'PLAN_LIMIT') {
      setStatus('quota');
      return;
    }
    if (next.blockReason === 'BRANCH_TYPE') {
      setStatus('retail');
      return;
    }
    setStatus(null);
  }, []);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const next = await getKiosk();
      applyState(next);
      if (next.session?.status === 'OPEN') {
        setCustomerMode(true);
      }
    } catch (error) {
      if (isApiError(error) && error.status === 403) {
        setStatus('denied');
        return;
      }
      setStatus('failure');
    }
  }, [applyState]);

  useEffect(() => {
    void load();
  }, [load, activeBranchId]);

  function focusPickup() {
    document.getElementById(`${formId}-pickup`)?.focus();
  }

  function focusWalkIn() {
    document.getElementById(`${formId}-name`)?.focus();
  }

  async function onOpen() {
    setBusy(true);
    try {
      const next = await openKiosk();
      applyState(next);
      setCustomerMode(true);
      setLastToken(null);
      queueMicrotask(focusPickup);
    } catch (error) {
      mapWriteError(error);
    } finally {
      setBusy(false);
    }
  }

  async function onClose() {
    setBusy(true);
    try {
      const next = await closeKiosk();
      applyState(next);
      setCustomerMode(false);
      setLastToken(null);
      setWalkInName('');
      setPickupRequest('');
    } catch (error) {
      mapWriteError(error);
    } finally {
      setBusy(false);
    }
  }

  async function onSubmitTicket(event: FormEvent) {
    event.preventDefault();
    if (!pickupRequest.trim()) {
      setStatus('validation');
      focusPickup();
      return;
    }
    setBusy(true);
    try {
      const next = await createKioskTicket(walkInName.trim(), pickupRequest.trim());
      const newest = next.waitingTickets[next.waitingTickets.length - 1];
      setLastToken(newest?.token ?? null);
      setWalkInName('');
      setPickupRequest('');
      applyState(next, 'success');
      queueMicrotask(focusWalkIn);
    } catch (error) {
      mapWriteError(error);
    } finally {
      setBusy(false);
    }
  }

  async function onCancelTicket(ticketId: string) {
    setBusy(true);
    try {
      const next = await cancelKioskTicket(ticketId);
      applyState(next);
    } catch (error) {
      mapWriteError(error);
    } finally {
      setBusy(false);
    }
  }

  function mapWriteError(error: unknown) {
    if (!isApiError(error)) {
      setStatus('failure');
      return;
    }
    if (error.status === 403) {
      setStatus('denied');
      return;
    }
    if (error.status === 409) {
      setStatus('conflict');
      return;
    }
    if (error.code === 'PLAN_LIMIT') {
      setStatus('quota');
      return;
    }
    if (error.code === 'BRANCH_TYPE') {
      setStatus('retail');
      return;
    }
    if (error.code === 'NO_ACTIVE_BRANCH') {
      setStatus('empty');
      return;
    }
    if (error.status === 400) {
      setStatus('validation');
      return;
    }
    setStatus('failure');
  }

  const banner = statusCopy(status);
  const open = state?.session?.status === 'OPEN';
  const canOperate =
    (hasModule || state?.hasModule) &&
    state?.planEntitled &&
    state?.branchType === 'KIOSK' &&
    Boolean(state?.activeBranchId);

  if (customerMode && open) {
    return (
      <div className="fixed inset-0 z-40 flex flex-col bg-canvas text-ink">
        <header className="flex items-center justify-between border-b border-line bg-surface px-4 py-3">
          <div>
            <p className="font-mono text-xs text-muted">Self-order kiosk</p>
            <h1 className="text-xl font-semibold">What do you need from this counter?</h1>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => setCustomerMode(false)}
            >
              Staff: counter view
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => void onClose()}
            >
              Staff: close kiosk
            </Button>
          </div>
        </header>
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-6">
          {banner ? (
            <div
              role="alert"
              className="flex items-start gap-2 border border-line bg-surface px-3 py-2 text-sm"
            >
              <banner.icon className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
              <p>{banner.text}</p>
            </div>
          ) : null}
          {lastToken != null ? (
            <p className="border border-brand bg-brand-soft px-4 py-6 text-center">
              <span className="block text-sm text-muted">Your pickup token</span>
              <span className="font-mono text-5xl tabular-nums text-ink">{lastToken}</span>
            </p>
          ) : null}
          <form
            id={formId}
            className="flex flex-col gap-4"
            onSubmit={(e) => void onSubmitTicket(e)}
          >
            <div className="grid gap-1">
              <Label htmlFor={`${formId}-name`}>Your name (optional)</Label>
              <Input
                id={`${formId}-name`}
                value={walkInName}
                onChange={(e) => setWalkInName(e.target.value)}
                autoComplete="name"
                className="h-12 text-lg"
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor={`${formId}-pickup`}>What to pick up</Label>
              <textarea
                id={`${formId}-pickup`}
                rows={4}
                value={pickupRequest}
                onChange={(e) => setPickupRequest(e.target.value)}
                className="rounded border border-line bg-surface px-3 py-2 text-lg text-ink"
              />
            </div>
            <Button type="submit" size="md" disabled={busy}>
              {busy ? 'Sending…' : 'Get pickup token'}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4">
      <Reveal>
        <header className="border-b border-line pb-3">
          <p className="font-mono text-xs tracking-wide text-muted">This outlet</p>
          <h1 className="text-2xl font-semibold text-ink">Self-order kiosk</h1>
          <p className="mt-1 max-w-xl text-sm text-muted">
            Open a walk-in kiosk on a Pro Kiosk outlet. Customers leave a pickup request; payment
            and stock stay at the till.
          </p>
        </header>
      </Reveal>

      {banner ? (
        <div
          role="alert"
          className="flex items-start gap-2 border border-line bg-surface px-3 py-2 text-sm text-ink"
        >
          <banner.icon className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
          <div>
            <p>{banner.text}</p>
            {status === 'quota' ? (
              <Link
                to={ROUTES.SUBSCRIPTION}
                className="mt-1 inline-block text-sm font-medium text-brand underline"
              >
                Open plan for this pharmacy
              </Link>
            ) : null}
            {status === 'empty' ? (
              <Link
                to={ROUTES.BRANCHES}
                className="mt-1 inline-block text-sm font-medium text-brand underline"
              >
                Open outlets
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}

      {status !== 'loading' && status !== 'denied' ? (
        <section
          className="border border-line bg-surface p-4"
          aria-labelledby="kiosk-staff-heading"
        >
          <h2 id="kiosk-staff-heading" className="text-sm font-semibold text-ink">
            Counter controls
          </h2>
          <p className="mt-1 text-sm text-muted">
            Outlet type: {state?.branchType ?? 'none'}
            {state?.activeBranchId ? '' : ' · no active outlet'}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {!open ? (
              <Button type="button" disabled={!canOperate || busy} onClick={() => void onOpen()}>
                Open this outlet’s kiosk
              </Button>
            ) : (
              <>
                <Button type="button" disabled={busy} onClick={() => setCustomerMode(true)}>
                  Show walk-in screen
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => void onClose()}
                >
                  Close kiosk
                </Button>
              </>
            )}
          </div>
        </section>
      ) : null}

      {open && (state?.waitingTickets.length ?? 0) > 0 ? (
        <section aria-labelledby="waiting-heading">
          <h2 id="waiting-heading" className="mb-2 text-sm font-semibold text-ink">
            Waiting pickups
          </h2>
          <ul className="flex flex-col gap-2">
            {state?.waitingTickets.map((ticket) => (
              <li
                key={ticket.id}
                className="flex flex-wrap items-start justify-between gap-3 border border-line bg-surface px-3 py-2"
              >
                <div>
                  <p className="font-mono text-lg tabular-nums text-ink">#{ticket.token}</p>
                  <p className="text-sm text-ink">
                    {ticket.walkInName ? ticket.walkInName : 'Walk-in'}
                  </p>
                  <p className="text-sm text-muted">{ticket.pickupRequest}</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => void onCancelTicket(ticket.id)}
                >
                  Clear slip
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : open ? (
        <p className="text-sm text-muted">No walk-in slips waiting at this outlet.</p>
      ) : null}
    </div>
  );
}
