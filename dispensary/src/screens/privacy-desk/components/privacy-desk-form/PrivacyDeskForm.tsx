import { useState } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (body: {
    principalType: string;
    requestType: string;
    submittedName: string;
    submittedPhone: string;
    principalId?: string;
  }) => void;
};

export function PrivacyDeskForm({ open, onClose, onSubmit }: Props) {
  const [principalType, setPrincipalType] = useState('CUSTOMER');
  const [requestType, setRequestType] = useState('ACCESS');
  const [submittedName, setSubmittedName] = useState('');
  const [submittedPhone, setSubmittedPhone] = useState('');
  const [principalId, setPrincipalId] = useState('');
  if (!open) return null;
  return (
    <form
      aria-label="Log a shop request"
      className="border-t border-line px-4 py-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({
          principalType,
          requestType,
          submittedName,
          submittedPhone,
          principalId: principalId.trim() || undefined,
        });
        onClose();
      }}
    >
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-sm">
          Person type
          <select
            className="mt-1 w-full border border-line bg-surface px-2 py-1"
            value={principalType}
            onChange={(event) => setPrincipalType(event.target.value)}
          >
            <option value="CUSTOMER">Customer</option>
            <option value="STAFF">Staff</option>
            <option value="DOCTOR">Doctor</option>
            <option value="SUPPLIER">Supplier</option>
          </select>
        </label>
        <label className="text-sm">
          Ask
          <select
            className="mt-1 w-full border border-line bg-surface px-2 py-1"
            value={requestType}
            onChange={(event) => setRequestType(event.target.value)}
          >
            <option value="ACCESS">Access</option>
            <option value="CORRECTION">Correction</option>
            <option value="EXPORT">Export</option>
            <option value="ERASURE">Erasure</option>
          </select>
        </label>
        <label className="text-sm">
          Name at the counter
          <input
            className="mt-1 w-full border border-line bg-surface px-2 py-1"
            value={submittedName}
            onChange={(event) => setSubmittedName(event.target.value)}
          />
        </label>
        <label className="text-sm">
          Phone at the counter
          <input
            className="mt-1 w-full border border-line bg-surface px-2 py-1"
            value={submittedPhone}
            onChange={(event) => setSubmittedPhone(event.target.value)}
          />
        </label>
        <label className="text-sm sm:col-span-2">
          Shop record id
          <input
            className="mt-1 w-full border border-line bg-surface px-2 py-1 font-mono text-xs"
            value={principalId}
            onChange={(event) => setPrincipalId(event.target.value)}
            placeholder="Leave blank for a walk-in customer"
          />
        </label>
      </div>
      <div className="mt-3 flex gap-2">
        <button type="submit" className="rounded-md bg-brand px-3 py-1.5 text-sm text-canvas">
          Save this request
        </button>
        <button type="button" className="text-sm text-muted" onClick={onClose}>
          Cancel
        </button>
      </div>
    </form>
  );
}
