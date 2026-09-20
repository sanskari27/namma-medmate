import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '@/store';
import { PrivacyDeskHeader } from './components/privacy-desk-header';
import { PrivacyDeskStatusBanner } from './components/privacy-desk-status-banner';
import { PrivacyDeskList } from './components/privacy-desk-list';
import { PrivacyDeskDetail } from './components/privacy-desk-detail';
import { PrivacyDeskForm } from './components/privacy-desk-form';
import { privacyCopy } from './PrivacyDeskScreen.utils';
import {
  acceptRequest,
  accessDenied,
  closeRequest,
  loadPrivacyDesk,
  logRequest,
  selectPrivacyItems,
  selectPrivacySelectedId,
  selectPrivacyStatus,
  selectRequest,
} from './store';

export default function PrivacyDeskScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  const allowed = user?.role === 'pharmacy_owner';
  const status = useSelector(selectPrivacyStatus);
  const items = useSelector(selectPrivacyItems);
  const selectedId = useSelector(selectPrivacySelectedId);
  const selected = items.find((row) => row.id === selectedId) ?? null;
  const [formOpen, setFormOpen] = useState(false);
  const logRef = useRef<HTMLButtonElement>(null);
  const text = privacyCopy(status);

  useEffect(() => {
    if (!allowed) {
      dispatch(accessDenied());
      return;
    }
    void dispatch(loadPrivacyDesk());
  }, [allowed, dispatch]);

  return (
    <div className="flex h-full flex-col bg-canvas text-ink" aria-label="Privacy desk">
      <PrivacyDeskStatusBanner
        text={text}
        tone={status === 'failure' || status === 'denied' ? 'alert' : status === 'success' ? 'ok' : undefined}
      />
      <PrivacyDeskHeader logRef={logRef} onLog={() => setFormOpen(true)} />
      <PrivacyDeskForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          logRef.current?.focus();
        }}
        onSubmit={(body) => {
          void dispatch(logRequest(body));
        }}
      />
      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-2">
        <PrivacyDeskList
          items={items}
          selectedId={selectedId}
          onSelect={(id) => dispatch(selectRequest(id))}
        />
        <PrivacyDeskDetail
          request={selected}
          onAccept={(identityMethod) => {
            if (selected) void dispatch(acceptRequest({ id: selected.id, identityMethod }));
          }}
          onClose={(decision, correction) => {
            if (selected) void dispatch(closeRequest({ id: selected.id, decision, correction }));
          }}
        />
      </div>
    </div>
  );
}
