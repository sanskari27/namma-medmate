import { Button } from '@atoms';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@molecules';
import { ApiError, isApiError } from '@/services/axios';
import { listRoles, listUserRoles, replaceUserRoles, type AccessRole } from '@/services/roles';
import type { HqOperator } from '@/services/staff';
import { FormEvent, useEffect, useId, useRef, useState } from 'react';

type DialogStatus = 'loading' | 'empty' | 'denied' | 'failure' | null;

interface DeskAssignmentDialogProps {
  operator: HqOperator;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (message: string) => void;
}

export function DeskAssignmentDialog({
  operator,
  open,
  onOpenChange,
  onSuccess,
}: DeskAssignmentDialogProps) {
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
    void Promise.all([listRoles(), listUserRoles(operator.id)])
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
  }, [open, operator.id]);

  const message =
    status === 'loading'
      ? 'Loading desks'
      : status === 'empty'
        ? 'No desks to assign yet. Create one under HQ desks.'
        : status === 'denied'
          ? 'Only the HQ administrator can assign desks.'
          : status === 'failure'
            ? 'Could not save desk assignment. Try again.'
            : null;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setStatus('loading');
    try {
      await replaceUserRoles(operator.id, picked);
      onSuccess(`Desk assignment saved for ${operator.displayName}.`);
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
        <DialogTitle>Desk assignment</DialogTitle>
        <DialogDescription>
          {operator.displayName} can have more than one desk. The administrator already has full HQ
          access and is not listed here.
        </DialogDescription>
        {message ? (
          <p id={statusId} role="alert" className="mt-3 text-sm text-ink">
            {message}
          </p>
        ) : null}
        <form onSubmit={(event) => void onSubmit(event)} className="mt-4 space-y-3">
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">HQ desks</caption>
            <tbody>
              {roles.map((row) => (
                <tr key={row.id} className="border-b border-line">
                  <td className="py-2">
                    <input
                      id={`desk-assign-${row.id}`}
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
                  </td>
                  <td className="py-2 text-ink">{row.name}</td>
                  <td className="py-2 text-right font-mono text-[10px] text-muted">
                    {row.kind === 'PREDEFINED' ? 'Built-in' : 'Custom'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={status === 'loading'}>
              Save assignment
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
