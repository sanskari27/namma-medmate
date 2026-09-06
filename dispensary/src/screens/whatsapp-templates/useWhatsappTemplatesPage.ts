import { isApiError } from '@/services/axios';
import {
  listWhatsAppTemplates,
  saveWhatsAppVariables,
  type WhatsAppProvider,
  type WhatsAppTemplate,
} from '@/services/whatsappTemplates';
import type { RootState } from '@/store';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  apiStatusHint,
  isOwner,
  mapApiStatus,
  slotsFilled,
  type PageStatus,
} from './WhatsappTemplatesScreen.utils';

function previewWith(template: WhatsAppTemplate, values: Record<string, string>): string {
  let rendered = template.body;
  for (const [key, value] of Object.entries(values)) {
    if (!value.trim()) {
      continue;
    }
    rendered = rendered.split(`{{${key}}}`).join(value);
  }
  return rendered;
}

export function useWhatsappTemplatesPage() {
  const user = useSelector((state: RootState) => state.auth.user);
  const statusId = useId();
  const saveRef = useRef<HTMLButtonElement | null>(null);
  const allowed = isOwner(user?.role);

  const [status, setStatus] = useState<PageStatus>(allowed ? 'loading' : 'denied');
  const [statusHint, setStatusHint] = useState<string | null>(null);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [provider, setProvider] = useState<WhatsAppProvider | null>(null);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const selected = templates.find((row) => row.uniqueName === selectedName) ?? null;

  const load = useCallback(
    async (keepName: string | null = null) => {
      if (!allowed) {
        setStatus('denied');
        return;
      }
      setStatus('loading');
      setStatusHint(null);
      try {
        const catalogue = await listWhatsAppTemplates();
        setProvider(catalogue.provider);
        setTemplates(catalogue.templates);
        const next =
          catalogue.templates.find((row) => row.uniqueName === keepName) ??
          catalogue.templates[0] ??
          null;
        setSelectedName(next?.uniqueName ?? null);
        setValues(next?.variables ?? {});
        setStatus(catalogue.templates.length === 0 ? 'empty' : null);
      } catch (error) {
        setStatus(isApiError(error) ? mapApiStatus(error) : 'failure');
      }
    },
    [allowed],
  );

  useEffect(() => {
    if (!allowed) {
      setStatus('denied');
      return;
    }
    void load(null);
  }, [allowed, load]);

  function selectTemplate(uniqueName: string) {
    const row = templates.find((item) => item.uniqueName === uniqueName);
    if (!row) {
      return;
    }
    setSelectedName(uniqueName);
    setValues(row.variables ?? {});
    setStatus(null);
    setStatusHint(null);
  }

  function onSlotChange(slot: string, value: string) {
    setValues((prev) => ({ ...prev, [slot]: value }));
  }

  async function onSave() {
    if (!selected) {
      setStatus('empty');
      return;
    }
    if (!slotsFilled(values, selected.tenantSlots)) {
      setStatus('validation');
      setStatusHint(null);
      return;
    }
    setBusy(true);
    try {
      await saveWhatsAppVariables(selected.uniqueName, values, selected.version);
      await load(selected.uniqueName);
      setStatus('success');
      setStatusHint('WhatsApp slots saved for this pharmacy.');
      saveRef.current?.focus();
    } catch (error) {
      if (isApiError(error)) {
        setStatus(mapApiStatus(error));
        setStatusHint(apiStatusHint(error.code));
      } else {
        setStatus('failure');
        setStatusHint('Could not save WhatsApp slots. Check the connection and try again.');
      }
    } finally {
      setBusy(false);
    }
  }

  return {
    allowed,
    status,
    statusHint,
    statusId,
    templates,
    provider,
    selected,
    values,
    preview: selected ? previewWith(selected, values) : '',
    busy,
    saveRef,
    selectTemplate,
    onSlotChange,
    onSave,
  };
}
