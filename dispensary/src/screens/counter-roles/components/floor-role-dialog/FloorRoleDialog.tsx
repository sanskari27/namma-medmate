import { Button, Input, Label } from '@atoms';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@molecules';
import { ApiError, isApiError } from '@/services/axios';
import { createRole, type ModuleCatalogItem } from '@/services/roles';
import { FormEvent, useEffect, useId, useRef, useState } from 'react';
import { moduleLabel } from '../../CounterRolesScreen.utils';

type DialogStatus = 'empty' | 'validation' | 'loading' | 'denied' | 'conflict' | 'failure';

interface FloorRoleDialogProps {
  open: boolean;
  catalog: ModuleCatalogItem[];
  onOpenChange: (open: boolean) => void;
  onSuccess: (message: string) => void;
}

export function FloorRoleDialog({ open, catalog, onOpenChange, onSuccess }: FloorRoleDialogProps) {
  const statusId = useId();
  const restoreRef = useRef<HTMLElement | null>(null);
  const [name, setName] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [status, setStatus] = useState<DialogStatus>('empty');

  useEffect(() => {
    if (open) {
      restoreRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setName('');
      setPicked([]);
      setStatus('empty');
    } else {
      restoreRef.current?.focus();
    }
  }, [open]);

  const message =
    status === 'validation'
      ? 'Enter a role name and select at least one area this pharmacy already has.'
      : status === 'denied'
        ? 'Only the pharmacy owner can manage floor roles.'
        : status === 'conflict'
          ? 'A role with this name already exists at this pharmacy.'
          : status === 'failure'
            ? 'Could not save this role. Try again.'
            : null;

  const toggle = (code: string, entitled: boolean) => {
    if (!entitled) {
      return;
    }
    setPicked((current) =>
      current.includes(code) ? current.filter((item) => item !== code) : [...current, code],
    );
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || picked.length === 0) {
      setStatus('validation');
      return;
    }
    setStatus('loading');
    try {
      await createRole(name.trim(), picked);
      onSuccess('Role saved. Assign it to staff from Staff accounts.');
      onOpenChange(false);
    } catch (error) {
      if (isApiError(error) || error instanceof ApiError) {
        if (error.status === 409 || error.code === 'ROLE_NAME_TAKEN') {
          setStatus('conflict');
          return;
        }
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
        <DialogTitle>Add role</DialogTitle>
        <DialogDescription>
          Name the role and select the areas it can use. Greyed items are not included in the
          current plan.
        </DialogDescription>
        {message ? (
          <p id={statusId} role="alert" className="mt-3 text-sm text-ink">
            {message}
          </p>
        ) : null}
        <form onSubmit={onSubmit} className="mt-4 space-y-3" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="role-name">Role name</Label>
            <Input id="role-name" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <fieldset className="space-y-1 border border-line bg-canvas px-3 py-2">
            <legend className="px-1 text-xs font-medium text-ink">Pharmacy areas</legend>
            {catalog.map((item) => {
              const id = `mod-${item.code}`;
              return (
                <label
                  key={item.code}
                  htmlFor={id}
                  className="flex items-start gap-2 border-b border-line py-1.5 last:border-b-0"
                >
                  <input
                    id={id}
                    type="checkbox"
                    className="mt-0.5 size-4 accent-brand"
                    aria-label={moduleLabel(item.code)}
                    checked={picked.includes(item.code)}
                    disabled={!item.entitled || item.gated}
                    onChange={() => toggle(item.code, item.entitled && !item.gated)}
                  />
                  <span className="min-w-0">
                    <span className="block text-sm text-ink">{moduleLabel(item.code)}</span>
                    {item.gated ? (
                      <span className="block text-xs text-warn">
                        Not on this pharmacy&apos;s plan. Upgrade to include this area.
                      </span>
                    ) : null}
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
              Save role
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
