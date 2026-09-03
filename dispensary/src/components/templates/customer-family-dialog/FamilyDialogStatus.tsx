import type { DialogStatus } from './familyDialog.types';

export function FamilyDialogStatus({ status }: { status: DialogStatus }) {
  if (status === 'loading') {
    return (
      <p role="status" className="mt-3 text-sm text-muted">
        Checking family link…
      </p>
    );
  }
  if (status === 'empty') {
    return (
      <p role="status" className="mt-3 text-sm text-muted">
        No other customer on this floor to link.
      </p>
    );
  }
  if (status === 'validation') {
    return (
      <p role="status" className="mt-3 text-sm text-danger">
        Choose a dependent to link into this family.
      </p>
    );
  }
  if (status === 'denied') {
    return (
      <p role="alert" className="mt-3 text-sm text-danger">
        CRM access is required to link family members.
      </p>
    );
  }
  if (status === 'conflict') {
    return (
      <p role="alert" className="mt-3 text-sm text-warn">
        That profile already belongs to another family.
      </p>
    );
  }
  if (status === 'failure') {
    return (
      <p role="alert" className="mt-3 text-sm text-danger">
        Could not update the family. Try again.
      </p>
    );
  }
  if (status === 'success') {
    return (
      <p role="status" className="mt-3 text-sm text-brand">
        Family members updated.
      </p>
    );
  }
  return null;
}
