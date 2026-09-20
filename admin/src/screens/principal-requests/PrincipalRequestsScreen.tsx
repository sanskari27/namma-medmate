import { Reveal } from '@atoms';
import { isApiError } from '@/services/axios';
import {
  acceptHqDpdpRequest,
  createHqDpdpRequest,
  decideHqDpdpRequest,
  listHqDpdpRequests,
  type HqDpdpRequest,
} from '@/services/dpdp';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';
import { PrincipalRequestsHeader } from './components/principal-requests-header';
import { PrincipalRequestsStatus } from './components/principal-requests-status';
import { PrincipalRequestsList } from './components/principal-requests-list';
import { PrincipalRequestsDetail } from './components/principal-requests-detail';
import { PrincipalRequestsForm } from './components/principal-requests-form';
import { hqPrivacyCopy, type HqPrivacyStatus } from './PrincipalRequestsScreen.utils';

function mapError(error: unknown): HqPrivacyStatus {
  if (isApiError(error) && error.code === 'FORBIDDEN') return 'denied';
  if (isApiError(error) && error.code === 'VALIDATION_ERROR') return 'validation';
  if (isApiError(error) && (error.code === 'STALE_STATE' || error.status === 409)) return 'conflict';
  return 'failure';
}

export default function PrincipalRequestsScreen() {
  const role = useSelector((state: RootState) => state.auth.user?.role);
  const master = role === 'admin_super';
  const [items, setItems] = useState<HqDpdpRequest[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<HqPrivacyStatus>(master ? 'loading' : 'denied');
  const [formOpen, setFormOpen] = useState(false);
  const logRef = useRef<HTMLButtonElement>(null);
  const selected = items.find((row) => row.id === selectedId) ?? null;

  const load = useCallback(async () => {
    if (!master) {
      setStatus('denied');
      return;
    }
    setStatus('loading');
    try {
      const rows = await listHqDpdpRequests();
      setItems(rows);
      setStatus(rows.length === 0 ? 'empty' : null);
    } catch (error) {
      setStatus(mapError(error));
    }
  }, [master]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Reveal className="flex h-full flex-col bg-canvas text-ink" aria-label="Principal requests">
      <PrincipalRequestsStatus text={hqPrivacyCopy(status)} />
      <PrincipalRequestsHeader logRef={logRef} onLog={() => setFormOpen(true)} />
      <PrincipalRequestsForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          logRef.current?.focus();
        }}
        onSubmit={(body) => {
          void createHqDpdpRequest(body)
            .then((row) => {
              setItems((current) => [row, ...current.filter((item) => item.id !== row.id)]);
              setSelectedId(row.id);
              setStatus('success');
            })
            .catch((error: unknown) => setStatus(mapError(error)));
        }}
      />
      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-2">
        <PrincipalRequestsList items={items} selectedId={selectedId} onSelect={setSelectedId} />
        <PrincipalRequestsDetail
          request={selected}
          onAccept={(identityMethod) => {
            if (!selected) return;
            void acceptHqDpdpRequest(selected.id, identityMethod)
              .then((row) => {
                setItems((current) => current.map((item) => (item.id === row.id ? row : item)));
                setStatus('success');
              })
              .catch((error: unknown) => setStatus(mapError(error)));
          }}
          onClose={(decision, correction) => {
            if (!selected) return;
            void decideHqDpdpRequest(selected.id, { decision, correction })
              .then((row) => {
                setItems((current) => current.map((item) => (item.id === row.id ? row : item)));
                setStatus('success');
              })
              .catch((error: unknown) => setStatus(mapError(error)));
          }}
        />
      </div>
    </Reveal>
  );
}
