import { Button, Input, Label } from '@atoms';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@molecules';
import { ApiError, isApiError } from '@/services/axios';
import { approveStaffVerification, type StaffVerificationItem } from '@/services/staff';
import { FormEvent, useEffect, useId, useRef, useState } from 'react';

type DialogStatus = 'empty' | 'validation' | 'loading' | 'denied' | 'conflict' | 'failure';

interface ApprovePackDialogProps {
  pack: StaffVerificationItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ApprovePackDialog({ pack, open, onOpenChange, onSuccess }: ApprovePackDialogProps) {
  const statusId = useId();
  const restoreRef = useRef<HTMLElement | null>(null);
  const [evidence, setEvidence] = useState('');
  const [status, setStatus] = useState<DialogStatus>('empty');

  useEffect(() => {
    if (open) {
      restoreRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setEvidence('');
      setStatus('empty');
    } else {
      restoreRef.current?.focus();
    }
  }, [open]);

  const message =
    status === 'validation'
      ? 'Enter verification notes before approving.'
      : status === 'denied'
        ? 'You do not have permission to approve staff.'
        : status === 'conflict'
          ? 'This registration has already been decided.'
          : status === 'failure'
            ? 'Could not save this approval. Try again.'
            : null;

  const onApprove = async (event: FormEvent) => {
    event.preventDefault();
    if (!evidence.trim()) {
      setStatus('validation');
      return;
    }
    setStatus('loading');
    try {
      await approveStaffVerification(pack.id, evidence.trim());
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      if (isApiError(error) || error instanceof ApiError) {
        if (error.status === 409) {
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
        <DialogTitle>Approve staff</DialogTitle>
        <DialogDescription>
          Record verification notes for {pack.displayName}. Your reviewer identity and timestamp are
          saved on approve.
        </DialogDescription>
        <dl className="mt-3 space-y-1 text-[11px] text-muted">
          <div className="flex justify-between gap-4">
            <dt>Pharmacy</dt>
            <dd className="font-mono text-ink">{pack.tenantId ?? 'HQ'}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Role</dt>
            <dd className="text-ink">{pack.kind === 'PHARMACIST' ? 'Pharmacist' : 'Staff'}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Licence number</dt>
            <dd className="text-ink">{pack.licenseNumber ?? 'None on file'}</dd>
          </div>
        </dl>
        {message ? (
          <p id={statusId} role="alert" className="mt-3 text-sm text-ink">
            {message}
          </p>
        ) : null}
        <form onSubmit={onApprove} className="mt-4 space-y-3" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="evidence">Verification notes</Label>
            <Input
              id="evidence"
              value={evidence}
              onChange={(event) => setEvidence(event.target.value)}
              placeholder="PCI licence KA-PCI-99"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={status === 'loading'}>
              {status === 'loading' ? 'Saving' : 'Approve access'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
