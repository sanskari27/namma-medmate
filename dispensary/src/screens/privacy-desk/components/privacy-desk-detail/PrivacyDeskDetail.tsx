import { useState } from 'react';
import type { DpdpRequest } from '@/services/dpdp';

type Props = {
  request: DpdpRequest | null;
  onAccept: (identityMethod: string) => void;
  onClose: (decision: 'FULFILLED' | 'REFUSED', correction?: Record<string, string>) => void;
};

export function PrivacyDeskDetail({ request, onAccept, onClose }: Props) {
  const [method, setMethod] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  if (!request) {
    return <p className="px-4 py-6 text-sm text-muted">Pick a request on the left.</p>;
  }
  const correction =
    request.requestType === 'CORRECTION'
      ? {
          ...(name.trim() ? { name: name.trim() } : {}),
          ...(phone.trim() ? { phone: phone.trim() } : {}),
        }
      : undefined;
  return (
    <section className="flex flex-col gap-3 px-4 py-3" aria-label="Request file">
      <h2 className="text-base text-ink">
        {request.requestType} · {request.principalType}
      </h2>
      <p className="text-sm text-muted">
        {request.legalRetention
          ? 'Legal invoice or register kept. Optional shop fields were cleared.'
          : request.notes ?? 'No extra note.'}
      </p>
      {request.exportJson ? (
        <pre className="overflow-auto border border-line bg-surface p-2 font-mono text-xs">
          {request.exportJson}
        </pre>
      ) : null}
      {request.status === 'RECEIVED' ? (
        <form
          className="flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            onAccept(method);
          }}
        >
          <label className="text-sm text-ink" htmlFor="identity-method">
            How you checked them
          </label>
          <input
            id="identity-method"
            className="border border-line bg-surface px-2 py-1 text-sm"
            value={method}
            onChange={(event) => setMethod(event.target.value)}
          />
          <button type="submit" className="self-start rounded-md bg-brand px-3 py-1.5 text-sm text-canvas">
            Accept and start the 30 days
          </button>
        </form>
      ) : null}
      {request.status === 'ACCEPTED' ? (
        <div className="flex flex-col gap-2">
          {request.requestType === 'CORRECTION' ? (
            <>
              <label className="text-sm" htmlFor="correction-name">
                Corrected name
                <input
                  id="correction-name"
                  className="mt-1 w-full border border-line bg-surface px-2 py-1"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>
              <label className="text-sm" htmlFor="correction-phone">
                Corrected phone
                <input
                  id="correction-phone"
                  className="mt-1 w-full border border-line bg-surface px-2 py-1"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                />
              </label>
            </>
          ) : null}
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-md bg-brand px-3 py-1.5 text-sm text-canvas"
              onClick={() => onClose('FULFILLED', correction)}
            >
              Mark fulfilled
            </button>
            <button
              type="button"
              className="rounded-md border border-line px-3 py-1.5 text-sm"
              onClick={() => onClose('REFUSED')}
            >
              Refuse
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
