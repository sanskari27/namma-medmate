import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '@/store';
import './WhatsappTemplatesScreen.css';
import { TemplateCataloguePanel } from './components/template-catalogue-panel';
import { TemplatePreviewPanel } from './components/template-preview-panel';
import { TemplateVariableForm } from './components/template-variable-form';
import { WhatsappTemplatesEmptyState } from './components/whatsapp-templates-empty-state';
import { WhatsappTemplatesHeader } from './components/whatsapp-templates-header';
import { WhatsappTemplatesStatusBanner } from './components/whatsapp-templates-status-banner';
import { isOwner } from './WhatsappTemplatesScreen.utils';
import {
  accessDenied,
  loadWhatsappTemplates,
  saveWhatsappSlots,
  selectWhatsappBusy,
  selectWhatsappProvider,
  selectWhatsappSelected,
  selectWhatsappTemplates,
  selectWhatsappTemplatesStatus,
} from './store';

export default function WhatsappTemplatesScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const saveRef = useRef<HTMLButtonElement | null>(null);
  const role = useSelector((state: RootState) => state.auth.user?.role);
  const allowed = isOwner(role);
  const status = useSelector(selectWhatsappTemplatesStatus);
  const templates = useSelector(selectWhatsappTemplates);
  const selected = useSelector(selectWhatsappSelected);
  const provider = useSelector(selectWhatsappProvider);
  const busy = useSelector(selectWhatsappBusy);

  useEffect(() => {
    if (!allowed) {
      dispatch(accessDenied());
      return;
    }
    void dispatch(loadWhatsappTemplates(null));
  }, [allowed, dispatch]);

  return (
    <div className="ws" aria-label="WhatsApp slots">
      <WhatsappTemplatesHeader
        saveRef={saveRef}
        denied={!allowed}
        busy={busy}
        displayNumber={provider?.displayNumber}
        onSave={() => {
          void dispatch(saveWhatsappSlots()).then(() => saveRef.current?.focus());
        }}
      />
      <WhatsappTemplatesStatusBanner />
      {allowed && status !== 'loading' && status !== 'denied' ? (
        templates.length === 0 ? (
          <WhatsappTemplatesEmptyState />
        ) : (
          <div className="ws-split">
            <TemplateCataloguePanel />
            {selected ? (
              <div className="ws-stack">
                <TemplateVariableForm />
                <TemplatePreviewPanel />
              </div>
            ) : null}
          </div>
        )
      ) : null}
    </div>
  );
}
