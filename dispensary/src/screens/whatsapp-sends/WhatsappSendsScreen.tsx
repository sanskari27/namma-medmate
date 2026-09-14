import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '@/store';
import { WhatsappSendsDetailPanel } from './components/whatsapp-sends-detail-panel';
import { WhatsappSendsEmptyState } from './components/whatsapp-sends-empty-state';
import { WhatsappSendsHeader } from './components/whatsapp-sends-header';
import { WhatsappSendsListPanel } from './components/whatsapp-sends-list-panel';
import { WhatsappSendsStatusBanner } from './components/whatsapp-sends-status-banner';
import { hasCampaignAccess } from './WhatsappSendsScreen.utils';
import {
  accessDenied,
  loadWhatsappSends,
  retryWhatsappSend,
  selectWhatsappSendsFailed,
  selectWhatsappSendsKind,
  selectWhatsappSendsQueued,
  selectWhatsappSendsSelected,
  selectWhatsappSendsSent,
  selectWhatsappSendsStatus,
} from './store';
import './WhatsappSendsScreen.css';

export default function WhatsappSendsScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const retryRef = useRef<HTMLButtonElement | null>(null);
  const user = useSelector((state: RootState) => state.auth.user);
  const allowed = hasCampaignAccess(user?.role, user?.modules);
  const status = useSelector(selectWhatsappSendsStatus);
  const selected = useSelector(selectWhatsappSendsSelected);
  const queued = useSelector(selectWhatsappSendsQueued);
  const sent = useSelector(selectWhatsappSendsSent);
  const failed = useSelector(selectWhatsappSendsFailed);
  const kind = useSelector(selectWhatsappSendsKind);

  useEffect(() => {
    if (!allowed) {
      dispatch(accessDenied());
      return;
    }
    void dispatch(loadWhatsappSends());
  }, [allowed, dispatch, kind]);

  return (
    <div className="wh" aria-label="WhatsApp sends">
      <WhatsappSendsHeader denied={!allowed} queued={queued} sent={sent} failed={failed} />
      <WhatsappSendsStatusBanner />
      {allowed ? (
        <div className="wh-split">
          <WhatsappSendsListPanel />
          {selected ? (
            <WhatsappSendsDetailPanel
              retryRef={retryRef}
              onRetry={() => {
                void dispatch(retryWhatsappSend()).then(() => retryRef.current?.focus());
              }}
            />
          ) : status === 'empty' ? (
            <WhatsappSendsEmptyState />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
