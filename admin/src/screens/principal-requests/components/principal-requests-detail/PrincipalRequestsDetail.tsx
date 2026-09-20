import { useState } from 'react';
import type { HqDpdpRequest } from '@/services/dpdp';

type Props = {
  request: HqDpdpRequest | null;
  onAccept: (identityMethod: string) => void;
  onClose: (decision: string, correction?: Record<string, string>) => void;
};

export function PrincipalRequestsDetail({ request, onAccept, onClose }: Props) {
  const [method, setMethod] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  if (!request) {
    return <p className="px-4 py-6 text-sm text-muted">Select a platform request.</p>;
  }
  const correction =
    request.requestType === 'CORRECTION'
      ? {
          ...(displayName.trim() ? { displayName: displayName.trim() } : {}),
          ...(phone.trim() ? { phone: phone.trim() } : {}),
        }
      : undefined;
  return (
    <section className="flex flex-col gap-3 px-4 py-3" aria-label="HQ request file">
      <h2 className="font-serif text-lg text-ink">
        {request.requestType} · {request.principalType}
      </h2>
      {request.status === 'RECEIVED' ? (
        <form
          className="flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            onAccept(method);
          }}
        >
          <label className="text-sm" htmlFor="hq-identity">
            HQ verification note
          </label>
          <input
            id="hq-identity"
            className="border border-line bg-elevated px-2 py-1 text-sm"
            value={method}
            onChange={(event) => setMethod(event.target.value)}
          />
          <button type="submit" className="self-start rounded-sm bg-brand px-3 py-1.5 text-sm text-canvas">
            Accept clock
          </button>
        </form>
      ) : null}
      {request.status === 'ACCEPTED' ? (
        <div className="flex flex-col gap-2">
          {request.requestType === 'CORRECTION' ? (
            <>
              <label className="text-sm" htmlFor="hq-display-name">
                Corrected display name
                <input
                  id="hq-display-name"
                  className="mt-1 w-full border border-line bg-elevated px-2 py-1"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                />
              </label>
              <label className="text-sm" htmlFor="hq-phone">
                Corrected phone
                <input
                  id="hq-phone"
                  className="mt-1 w-full border border-line bg-elevated px-2 py-1"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                />
              </label>
            </>
          ) : null}
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-sm bg-brand px-3 py-1.5 text-sm text-canvas"
              onClick={() => onClose('FULFILLED', correction)}
            >
              Fulfill
            </button>
            <button
              type="button"
              className="border border-line px-3 py-1.5 text-sm"
              onClick={() => onClose('REFUSED')}
            >
              Refuse
            </button>
          </div>
        </div>
      ) : null}
      {request.exportJson ? (
        <pre className="overflow-auto border border-line bg-elevated p-2 font-mono text-xs">
          {request.exportJson}
        </pre>
      ) : null}
    </section>
  );
}
