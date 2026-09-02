import { AlertTriangle, Inbox, WifiOff } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useId, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  countHqUnread,
  fileHqInboxItem,
  isApiError,
  listHqInbox,
  openHqInboxItem,
  type HqInboxItem,
} from '@/services/inbox';
import { inboxPageLoaded, inboxRowFiled, unreadLoaded, type RootState } from '@/store';

type DeskStatus =
  | 'idle'
  | 'loading'
  | 'empty'
  | 'validation'
  | 'denied'
  | 'conflict'
  | 'failure'
  | 'success'
  | 'deleted';

const PAGE_SIZE = 6;

function formatHqStamp(iso: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}

function deskCopy(status: DeskStatus): { icon: typeof AlertTriangle; text: string } | null {
  switch (status) {
    case 'validation':
      return { icon: AlertTriangle, text: 'That inbox id is not valid for this operator session.' };
    case 'denied':
      return {
        icon: AlertTriangle,
        text: 'This operator no longer has access to that tenant file.',
      };
    case 'deleted':
      return { icon: AlertTriangle, text: 'That KYC pack was withdrawn. Reload if the SLA still matters.' };
    case 'conflict':
      return { icon: AlertTriangle, text: 'The tenant file moved. Reload this inbox before opening it.' };
    case 'failure':
      return { icon: WifiOff, text: 'HQ cannot reach the API. Retry from this session.' };
    default:
      return null;
  }
}

export function HqInboxBell() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const inbox = useSelector((state: RootState) => state.inbox);
  const headingId = useId();
  const hintId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<DeskStatus>('idle');
  const banner = deskCopy(status);

  useEffect(() => {
    let cancelled = false;
    countHqUnread()
      .then((count) => {
        if (!cancelled) {
          dispatch(unreadLoaded(count));
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
      const data = await listHqInbox(page, PAGE_SIZE);
      dispatch(inboxPageLoaded(data));
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

  const onFile = async (row: HqInboxItem) => {
    try {
      const updated = await fileHqInboxItem(row.id);
      dispatch(inboxRowFiled(updated));
      setStatus('success');
    } catch (error) {
      if (isApiError(error) && error.status === 400) {
        setStatus('validation');
        return;
      }
      setStatus('failure');
    }
  };

  const onOpenFile = async (row: HqInboxItem) => {
    try {
      const target = await openHqInboxItem(row.id);
      dispatch(inboxRowFiled({ ...row, read: true }));
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

  const triggerName = inbox.unread > 0 ? `HQ inbox, ${inbox.unread} unread` : 'HQ inbox';

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          ref={triggerRef}
          type="button"
          className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-sm border border-line bg-canvas px-2 font-mono text-[11px] text-ink hover:bg-elevated"
          aria-label={triggerName}
        >
          <Inbox className="size-3.5 text-brand" aria-hidden />
          Inbox
          {inbox.unread > 0 ? (
            <span className="rounded-sm bg-brand-soft px-1 text-brand">{inbox.unread}</span>
          ) : (
            <span className="text-muted">0</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent aria-labelledby={headingId} aria-describedby={hintId}>
        <motion.div
          className="flex max-h-[26rem] flex-col"
          initial={reduce ? false : { opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="border-b border-line px-3 py-2">
            <p id={headingId} className="font-serif text-sm text-ink">
              HQ inbox
            </p>
            <p id={hintId} className="font-mono text-[11px] text-muted">
              Tenant signals for this operator. Unread is labelled, not just tinted.
            </p>
          </div>
          {banner ? (
            <p role="alert" className="flex items-start gap-2 border-b border-line bg-brand-soft px-3 py-2 text-xs text-ink">
              <banner.icon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              {banner.text}
            </p>
          ) : null}
          {status === 'loading' ? (
            <p className="px-3 py-6 font-mono text-xs text-muted">Loading tenant signals…</p>
          ) : null}
          {status === 'empty' ? (
            <p className="px-3 py-6 text-sm text-muted">No tenant signals in this inbox.</p>
          ) : null}
          {inbox.rows.length > 0 && status !== 'loading' && status !== 'empty' ? (
            <table className="w-full text-left text-sm">
              <caption className="sr-only">HQ inbox</caption>
              <thead className="border-b border-line text-[11px] text-muted">
                <tr>
                  <th scope="col" className="px-3 py-1.5 font-mono font-normal">
                    IST
                  </th>
                  <th scope="col" className="px-3 py-1.5 font-normal">
                    Signal
                  </th>
                </tr>
              </thead>
              <tbody>
                {inbox.rows.map((row) => (
                  <tr key={row.id} className="border-b border-line last:border-b-0">
                    <td className="align-top px-3 py-2">
                      <time className="font-mono text-[11px] text-muted" dateTime={row.createdAt}>
                        {formatHqStamp(row.createdAt)} IST
                      </time>
                      <p className="mt-1 text-[11px] text-brand">{row.read ? 'Filed' : 'Unread'}</p>
                    </td>
                    <td className="px-3 py-2">
                      <p className="text-sm text-ink">{row.title}</p>
                      {row.body ? <p className="mt-0.5 text-xs text-muted">{row.body}</p> : null}
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button type="button" size="sm" onClick={() => void onOpenFile(row)}>
                          Open tenant file
                        </Button>
                        {row.read ? null : (
                          <Button type="button" size="sm" variant="ghost" onClick={() => void onFile(row)}>
                            File as read
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
          {inbox.pageCount > 1 ? (
            <div className="flex items-center justify-between border-t border-line px-3 py-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={inbox.page <= 0 || status === 'loading'}
                onClick={() => void loadPage(inbox.page - 1)}
              >
                Later page
              </Button>
              <p className="font-mono text-[11px] text-muted">
                {inbox.page + 1} of {inbox.pageCount}
              </p>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={inbox.page + 1 >= inbox.pageCount || status === 'loading'}
                onClick={() => void loadPage(inbox.page + 1)}
              >
                Earlier page
              </Button>
            </div>
          ) : null}
        </motion.div>
      </PopoverContent>
    </Popover>
  );
}
