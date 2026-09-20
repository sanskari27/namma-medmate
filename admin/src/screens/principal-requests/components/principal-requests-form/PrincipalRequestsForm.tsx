import { useState } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (body: { principalType: string; requestType: string; principalId: string }) => void;
};

export function PrincipalRequestsForm({ open, onClose, onSubmit }: Props) {
  const [principalType, setPrincipalType] = useState('MASTER');
  const [requestType, setRequestType] = useState('ACCESS');
  const [principalId, setPrincipalId] = useState('');
  if (!open) return null;
  return (
    <form
      aria-label="Record HQ request"
      className="border-b border-line px-4 py-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({ principalType, requestType, principalId });
        onClose();
      }}
    >
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="text-sm text-ink">
          Principal
          <select
            className="mt-1 w-full border border-line bg-elevated px-2 py-1"
            value={principalType}
            onChange={(event) => setPrincipalType(event.target.value)}
          >
            <option value="MASTER">MASTER account</option>
            <option value="OWNER_KYC">Pharmacy KYC</option>
          </select>
        </label>
        <label className="text-sm text-ink">
          Ask
          <select
            className="mt-1 w-full border border-line bg-elevated px-2 py-1"
            value={requestType}
            onChange={(event) => setRequestType(event.target.value)}
          >
            <option value="ACCESS">Access</option>
            <option value="CORRECTION">Correction</option>
            <option value="EXPORT">Export</option>
            <option value="ERASURE">Erasure</option>
          </select>
        </label>
        <label className="text-sm text-ink">
          Account or tenant id
          <input
            className="mt-1 w-full border border-line bg-elevated px-2 py-1 font-mono text-xs"
            value={principalId}
            onChange={(event) => setPrincipalId(event.target.value)}
          />
        </label>
      </div>
      <div className="mt-3 flex gap-2">
        <button type="submit" className="rounded-sm bg-brand px-3 py-1.5 text-sm text-canvas">
          File on the platform
        </button>
        <button type="button" className="text-sm text-muted" onClick={onClose}>
          Cancel
        </button>
      </div>
    </form>
  );
}
