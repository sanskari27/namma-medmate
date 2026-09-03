import { Button } from '@atoms';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@molecules';
import { ApiError, isApiError } from '@/services/axios';
import { listBranches, type Branch } from '@/services/branches';
import { listUserBranches, replaceUserBranches } from '@/services/userBranches';
import type { StaffAccount } from '@/services/staff';
import { FormEvent, useEffect, useId, useRef, useState } from 'react';

type DialogStatus =
  'loading' | 'empty' | 'validation' | 'denied' | 'conflict' | 'failure' | 'success' | null;

interface BranchesDialogProps {
  staff: StaffAccount;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (message: string) => void;
}

export function BranchesDialog({ staff, open, onOpenChange, onSuccess }: BranchesDialogProps) {
  const statusId = useId();
  const restoreRef = useRef<HTMLElement | null>(null);
  const [outlets, setOutlets] = useState<Branch[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [status, setStatus] = useState<DialogStatus>('loading');

  useEffect(() => {
    if (!open) {
      restoreRef.current?.focus();
      return;
    }
    restoreRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setStatus('loading');
    void Promise.all([listBranches(), listUserBranches(staff.id)])
      .then(([catalog, assigned]) => {
        setOutlets(catalog);
        setPicked(assigned.branches.map((row) => row.id));
        setStatus(catalog.length === 0 ? 'empty' : null);
      })
      .catch((error) => {
        if (isApiError(error) || error instanceof ApiError) {
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
      });
  }, [open, staff.id]);

  const message =
    status === 'loading'
      ? 'Loading outlets'
      : status === 'empty'
        ? 'No outlets yet. Add one under Outlets before assigning staff.'
        : status === 'validation'
          ? 'Pick at least one outlet, or save with none to clear assignment.'
          : status === 'denied'
            ? 'Only the pharmacy owner can assign outlets to staff.'
            : status === 'conflict'
              ? 'Outlet list changed. Close and try again.'
              : status === 'failure'
                ? 'Could not save outlets. Try again.'
                : null;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setStatus('loading');
    try {
      await replaceUserBranches(staff.id, picked);
      onSuccess(`Outlets updated for ${staff.displayName}.`);
      onOpenChange(false);
    } catch (error) {
      if (isApiError(error) || error instanceof ApiError) {
        if (error.status === 403) {
          setStatus('denied');
          return;
        }
        if (error.status === 409) {
          setStatus('conflict');
          return;
        }
        if (error.status === 400 || error.status === 422) {
          setStatus('validation');
          return;
        }
      }
      setStatus('failure');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <DialogTitle>Outlets</DialogTitle>
        <DialogDescription>
          Choose which outlets {staff.displayName} can open on this floor. Roles stay the same
          across every assigned outlet.
        </DialogDescription>
        {message ? (
          <p id={statusId} role="alert" className="mt-3 text-sm text-ink">
            {message}
          </p>
        ) : null}
        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <fieldset className="space-y-1 border border-line bg-canvas px-3 py-2">
            <legend className="px-1 text-xs font-medium text-ink">Outlets for this login</legend>
            {outlets.map((row) => {
              const id = `outlet-${row.id}`;
              return (
                <label key={row.id} htmlFor={id} className="flex items-center gap-2 py-1.5">
                  <input
                    id={id}
                    type="checkbox"
                    className="size-4 accent-brand"
                    aria-label={`${row.name} (${row.branchCode})`}
                    checked={picked.includes(row.id)}
                    onChange={() =>
                      setPicked((current) =>
                        current.includes(row.id)
                          ? current.filter((item) => item !== row.id)
                          : [...current, row.id],
                      )
                    }
                  />
                  <span className="text-sm text-ink">
                    {row.name}{' '}
                    <span className="font-mono text-xs text-muted">{row.branchCode}</span>
                  </span>
                </label>
              );
            })}
          </fieldset>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={status === 'loading'}>
              Save outlets
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
