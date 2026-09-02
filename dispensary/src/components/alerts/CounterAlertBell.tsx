import { AlertCircle, Bell, ChevronLeft, ChevronRight, WifiOff } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogDescription,
  DialogTitle,
  FloorSheetContent,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { cn } from '@/libs/cn';
import {
  inboxReceived,
  notificationRead,
  unreadReceived,
  type RootState,
} from '@/store';
import {
  fetchInbox,
  fetchUnreadCount,
  isApiError,
  markNotificationRead,
  openNotification,
  type InboxItem,
} from '@/services/notifications';

type PanelStatus =
  | 'idle'
  | 'loading'
  | 'empty'
  | 'validation'
  | 'denied'
  | 'conflict'
  | 'failure'
  | 'success'
  | 'deleted';

const PAGE_SIZE = 8;

function formatFloorClock(iso: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}

function floorDestination(sourceType: string): string {
  switch (sourceType) {
    case 'credit_due':
      return 'Opens khata';
    case 'supplier_due':
      return 'Opens purchases';
    case 'staff_license':
      return 'Opens employees';
    case 'license_expiry':
    case 'plan_limit':
    case 'subscription_expiry':
      return 'Opens subscription';
    case 'kyc':
    case 'account_created':
      return 'Opens account';
    default:
      return 'Opens inventory';
  }
}

function statusCopy(status: PanelStatus): { icon: typeof AlertCircle; text: string } | null {
  switch (status) {
    case 'validation':
      return { icon: AlertCircle, text: 'That slip id is not valid. Stay on this list and retry.' };
    case 'denied':
      return {
        icon: AlertCircle,
        text: 'You cannot open this record at this counter. Ask the owner if you still need it.',
      };
    case 'deleted':
      return {
        icon: AlertCircle,
        text: 'That stock record left the floor. The slip stays here so the till is not guessing.',
      };
    case 'conflict':
      return {
        icon: AlertCircle,
        text: 'This record moved. Refresh the slips before walking over.',
      };
    case 'failure':
      return { icon: WifiOff, text: 'Could not reach the server. Stay at this till and retry.' };
    default:
      return null;
  }
}

export function CounterAlertBell() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const inbox = useSelector((state: RootState) => state.notifications);
  const titleId = useId();
  const copyId = useId();
  const statusId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<PanelStatus>('idle');
  const banner = statusCopy(status);

  useEffect(() => {
    let cancelled = false;
    fetchUnreadCount()
      .then((count) => {
        if (!cancelled) {
          dispatch(unreadReceived(count));
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  const loadPage = async (page: number) => {
    setStatus('loading');
    try {
      const data = await fetchInbox(page, PAGE_SIZE);
      dispatch(inboxReceived(data));
      setStatus(data.items.length === 0 ? 'empty' : 'success');
    } catch (error) {
      if (isApiError(error) && error.status === 400) {
        setStatus('validation');
        return;
      }
      setStatus('failure');
    }
  };

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      void loadPage(0);
      return;
    }
    triggerRef.current?.focus();
  };

  const onMarkSeen = async (item: InboxItem) => {
    try {
      const updated = await markNotificationRead(item.id);
      dispatch(notificationRead(updated));
      setStatus('success');
    } catch (error) {
      if (isApiError(error) && error.status === 400) {
        setStatus('validation');
        return;
      }
      setStatus('failure');
    }
  };

  const onOpenSlip = async (item: InboxItem) => {
    try {
      const target = await openNotification(item.id);
      dispatch(notificationRead({ ...item, read: true }));
      setOpen(false);
      navigate(target.href);
    } catch (error) {
      if (isApiError(error)) {
        if (error.status === 400) {
          setStatus('validation');
          return;
        }
        if (error.code === 'SOURCE_DELETED' || error.status === 404) {
          setStatus('deleted');
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
      }
      setStatus('failure');
    }
  };

  const unreadLabel =
    inbox.unreadCount > 0 ? `Counter alerts, ${inbox.unreadCount} unread` : 'Counter alerts';

  const panel = (
    <div className="flex max-h-[min(28rem,calc(100vh-4rem))] flex-col overflow-hidden">
      <div className="shrink-0 border-b border-line px-3 py-2">
        <p id={titleId} className="text-sm font-medium text-ink">
          Counter alerts
        </p>
        <p id={copyId} className="text-xs text-muted">
          Slips for this till. Unread stays on the left rail.
        </p>
      </div>
      {banner ? (
        <p
          role="alert"
          id={statusId}
          className="flex items-start gap-2 border-b border-line bg-brand-soft px-3 py-2 text-xs text-ink"
        >
          <banner.icon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {banner.text}
        </p>
      ) : null}
      {status === 'loading' ? (
        <p className="px-3 py-6 text-sm text-muted">Pulling slips for this counter…</p>
      ) : null}
      {status === 'empty' ? (
        <p className="px-3 py-6 text-sm text-muted">No slips on this counter. Keep billing.</p>
      ) : null}
      {inbox.items.length > 0 && status !== 'loading' && status !== 'empty' ? (
        <ul className="panel-scroll min-h-0 flex-1 overflow-x-hidden overflow-y-auto pr-1.5" aria-labelledby={titleId}>
          {inbox.items.map((item) => (
            <li
              key={item.id}
              className={cn('flex border-b border-line last:border-b-0', item.read ? 'bg-surface' : 'bg-brand-soft/50')}
            >
              <span
                className={cn('w-1 shrink-0', item.read ? 'bg-transparent' : 'bg-brand')}
                aria-hidden
              />
              <div className="min-w-0 flex-1 px-3 py-2.5">
                <p className="break-words text-sm font-medium text-ink">{item.title}</p>
                {item.body ? <p className="mt-0.5 break-words text-xs text-muted">{item.body}</p> : null}
                <p className="mt-1 font-mono text-[11px] text-muted">{floorDestination(item.sourceType)}</p>
                <p className="mt-1 flex items-center justify-between gap-2">
                  <time className="font-mono text-[11px] text-muted" dateTime={item.createdAt}>
                    {formatFloorClock(item.createdAt)} IST
                  </time>
                  <span className="text-[11px] font-medium text-brand">{item.read ? 'Seen' : 'Unread'}</span>
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button type="button" size="sm" onClick={() => void onOpenSlip(item)}>
                    Open on this counter
                  </Button>
                  {item.read ? null : (
                    <Button type="button" size="sm" variant="ghost" onClick={() => void onMarkSeen(item)}>
                      Mark seen
                    </Button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      {inbox.totalPages > 1 ? (
        <div className="flex shrink-0 items-center justify-between border-t border-line px-3 py-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={inbox.page <= 0 || status === 'loading'}
            onClick={() => void loadPage(inbox.page - 1)}
          >
            <ChevronLeft className="size-3.5" aria-hidden />
            Newer slips
          </Button>
          <p className="font-mono text-[11px] text-muted">
            {inbox.page + 1}/{inbox.totalPages}
          </p>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={inbox.page + 1 >= inbox.totalPages || status === 'loading'}
            onClick={() => void loadPage(inbox.page + 1)}
          >
            Older slips
            <ChevronRight className="size-3.5" aria-hidden />
          </Button>
        </div>
      ) : null}
    </div>
  );

  const trigger = (
    <button
      ref={triggerRef}
      type="button"
      className="relative inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-ink hover:bg-brand-soft"
      aria-label={unreadLabel}
    >
      <Bell className="size-4" aria-hidden />
      {inbox.unreadCount > 0 ? (
        <span className="absolute top-0.5 right-0.5 min-w-3.5 rounded-sm bg-brand px-0.5 text-center font-mono text-[10px] leading-4 text-surface">
          {inbox.unreadCount > 9 ? '9+' : inbox.unreadCount}
        </span>
      ) : null}
    </button>
  );

  if (isDesktop) {
    return (
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        <PopoverContent aria-labelledby={titleId} aria-describedby={copyId}>
          {panel}
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <button
        ref={triggerRef}
        type="button"
        className="relative inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-ink hover:bg-brand-soft"
        aria-label={unreadLabel}
        onClick={() => onOpenChange(true)}
      >
        <Bell className="size-4" aria-hidden />
        {inbox.unreadCount > 0 ? (
          <span className="absolute top-0.5 right-0.5 min-w-3.5 rounded-sm bg-brand px-0.5 text-center font-mono text-[10px] leading-4 text-surface">
            {inbox.unreadCount > 9 ? '9+' : inbox.unreadCount}
          </span>
        ) : null}
      </button>
      <FloorSheetContent aria-describedby={copyId}>
        <DialogTitle className="sr-only">Counter alerts</DialogTitle>
        <DialogDescription id={copyId} className="sr-only">
          Slips for this till. Unread stays on the left rail.
        </DialogDescription>
        {panel}
      </FloorSheetContent>
    </Dialog>
  );
}
