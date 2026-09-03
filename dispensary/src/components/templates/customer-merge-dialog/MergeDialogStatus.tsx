import type { DialogStatus } from './mergeDialog.types';

export type MergeDialogStatusProps = {
  status: DialogStatus;
};

export function MergeDialogStatus({ status }: MergeDialogStatusProps) {
  if (status === 'loading') {
    return (
      <p role="status" className="mt-3 text-sm text-muted">
        Loading merge review…
      </p>
    );
  }
  if (status === 'empty') {
    return (
      <p role="status" className="mt-3 text-sm text-muted">
        No other customer on this floor to merge into this profile.
      </p>
    );
  }
  if (status === 'validation') {
    return (
      <p role="alert" className="mt-3 text-sm text-danger">
        Choose a duplicate and resolve every conflicting field before confirming.
      </p>
    );
  }
  if (status === 'denied') {
    return (
      <p role="alert" className="mt-3 text-sm text-danger">
        This till login cannot merge customer profiles. Ask the owner for CRM access.
      </p>
    );
  }
  if (status === 'conflict') {
    return (
      <p role="alert" className="mt-3 text-sm text-warn">
        That merge is no longer available. Refresh the list and pick active profiles again.
      </p>
    );
  }
  if (status === 'failure') {
    return (
      <p role="alert" className="mt-3 text-sm text-danger">
        Could not reach the server for this merge. Try again.
      </p>
    );
  }
  if (status === 'success') {
    return (
      <p role="status" className="mt-3 text-sm text-brand">
        Profiles merged. The survivor stays on the floor list.
      </p>
    );
  }
  return null;
}
