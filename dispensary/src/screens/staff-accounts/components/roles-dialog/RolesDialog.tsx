import { Button } from '@atoms';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@molecules';
import { ApiError, isApiError } from '@/services/axios';
import { listRoles, listUserRoles, replaceUserRoles, type AccessRole } from '@/services/roles';
import type { StaffAccount } from '@/services/staff';
import { FormEvent, useEffect, useId, useRef, useState } from 'react';

type DialogStatus = 'loading' | 'empty' | 'validation' | 'denied' | 'failure' | 'success' | null;

interface RolesDialogProps {
  staff: StaffAccount;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (message: string) => void;
}

export function RolesDialog({ staff, open, onOpenChange, onSuccess }: RolesDialogProps) {
  const statusId = useId();
  const restoreRef = useRef<HTMLElement | null>(null);
  const [roles, setRoles] = useState<AccessRole[]>([]);
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
    void Promise.all([listRoles(), listUserRoles(staff.id)])
      .then(([catalog, assigned]) => {
        setRoles(catalog.roles);
        setPicked(assigned.roles.map((row) => row.id));
        setStatus(catalog.roles.length === 0 ? 'empty' : null);
      })
      .catch((error) => {
        if (isApiError(error) || error instanceof ApiError) {
          if (error.status === 403) {
            setStatus('denied');
            return;
          }
        }
        setStatus('failure');
      });
  }, [open, staff.id]);

  const message =
    status === 'loading'
      ? 'Loading roles'
      : status === 'empty'
        ? 'No roles to assign yet. Create one under Floor roles.'
        : status === 'validation'
          ? 'Select at least one role, or save with none to remove access.'
          : status === 'denied'
            ? 'Only the pharmacy owner can change staff roles.'
            : status === 'failure'
              ? 'Could not save roles. Try again.'
              : null;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setStatus('loading');
    try {
      await replaceUserRoles(staff.id, picked);
      onSuccess(`Roles updated for ${staff.displayName}.`);
      onOpenChange(false);
    } catch (error) {
      if (isApiError(error) || error instanceof ApiError) {
        if (error.status === 403) {
          setStatus('denied');
          return;
        }
      }
      setStatus('failure');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <DialogTitle>Roles</DialogTitle>
        <DialogDescription>
          {staff.displayName} can have more than one role. The owner already has full access and is
          not listed here.
        </DialogDescription>
        {message ? (
          <p id={statusId} role="alert" className="mt-3 text-sm text-ink">
            {message}
          </p>
        ) : null}
        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <fieldset className="space-y-1 border border-line bg-canvas px-3 py-2">
            <legend className="px-1 text-xs font-medium text-ink">Roles for this login</legend>
            {roles.map((row) => {
              const id = `role-${row.id}`;
              return (
                <label key={row.id} htmlFor={id} className="flex items-center gap-2 py-1.5">
                  <input
                    id={id}
                    type="checkbox"
                    className="size-4 accent-brand"
                    aria-label={row.name}
                    checked={picked.includes(row.id)}
                    onChange={() =>
                      setPicked((current) =>
                        current.includes(row.id)
                          ? current.filter((item) => item !== row.id)
                          : [...current, row.id],
                      )
                    }
                  />
                  <span className="text-sm text-ink">{row.name}</span>
                </label>
              );
            })}
          </fieldset>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={status === 'loading'}>
              Save roles
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
