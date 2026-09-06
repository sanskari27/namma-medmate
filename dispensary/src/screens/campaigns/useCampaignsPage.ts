import { isApiError } from '@/services/axios';
import {
  createCampaign,
  listCampaigns,
  previewCampaign,
  readyCampaign,
  type Campaign,
  type CampaignTagOption,
  type CampaignTemplateOption,
} from '@/services/campaigns';
import { sendCampaignMessages } from '@/services/whatsappMessages';
import type { RootState } from '@/store';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  apiStatusHint,
  emptyForm,
  formValid,
  hasCampaignAccess,
  hasFinanceAccess,
  mapApiStatus,
  type FormState,
  type PageStatus,
} from './CampaignsScreen.utils';

export function useCampaignsPage() {
  const user = useSelector((state: RootState) => state.auth.user);
  const statusId = useId();
  const addRef = useRef<HTMLButtonElement | null>(null);
  const allowed = hasCampaignAccess(user?.role, user?.modules);
  const canSeeCa = hasFinanceAccess(user?.role, user?.roles);

  const [status, setStatus] = useState<PageStatus>(allowed ? 'loading' : 'denied');
  const [statusHint, setStatusHint] = useState<string | null>(null);
  const [items, setItems] = useState<Campaign[]>([]);
  const [tags, setTags] = useState<CampaignTagOption[]>([]);
  const [templates, setTemplates] = useState<CampaignTemplateOption[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [busy, setBusy] = useState(false);
  const [sendHint, setSendHint] = useState<string | null>(null);

  const selected = items.find((row) => row.id === selectedId) ?? null;

  const load = useCallback(async () => {
    if (!allowed) {
      setStatus('denied');
      return;
    }
    setStatus('loading');
    setStatusHint(null);
    try {
      const page = await listCampaigns();
      setItems(page.items);
      setTags(page.tags);
      setTemplates(page.templates);
      setStatus(page.items.length === 0 ? 'empty' : null);
    } catch (error) {
      setStatus(isApiError(error) ? mapApiStatus(error) : 'failure');
    }
  }, [allowed]);

  useEffect(() => {
    if (!allowed) {
      setStatus('denied');
      return;
    }
    void load();
  }, [allowed, load]);

  function onChange(patch: Partial<FormState>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  function toggleTag(tagId: string) {
    setForm((prev) => ({
      ...prev,
      tagIds: prev.tagIds.includes(tagId)
        ? prev.tagIds.filter((id) => id !== tagId)
        : [...prev.tagIds, tagId],
    }));
  }

  function startCreate() {
    setCreating(true);
    setSelectedId(null);
    setForm(emptyForm());
    setStatus(null);
    setStatusHint(null);
  }

  function selectCampaign(id: string) {
    const row = items.find((item) => item.id === id);
    if (!row) {
      return;
    }
    setCreating(false);
    setSelectedId(id);
    setForm({ name: row.name, tagIds: [...row.tagIds] });
    setStatus(null);
    setStatusHint(null);
  }

  function applySaved(saved: Campaign, successHint: string) {
    setItems((prev) => {
      const rest = prev.filter((row) => row.id !== saved.id);
      return [saved, ...rest];
    });
    setCreating(false);
    setSelectedId(saved.id);
    setForm({ name: saved.name, tagIds: [...saved.tagIds] });
    setStatus('success');
    setStatusHint(successHint);
    addRef.current?.focus();
  }

  async function onSave() {
    if (!formValid(form) || templates[0] == null) {
      setStatus('validation');
      setStatusHint(
        templates[0] == null
          ? 'Ask the owner to fill WhatsApp slots before this broadcast can go out.'
          : null,
      );
      return;
    }
    setBusy(true);
    try {
      const saved = await createCampaign({
        name: form.name.trim(),
        tagIds: form.tagIds,
        templateUniqueName: templates[0].uniqueName,
      });
      applySaved(saved, 'Broadcast saved as a draft at this counter.');
    } catch (error) {
      setStatus(isApiError(error) ? mapApiStatus(error) : 'failure');
      setStatusHint(isApiError(error) ? apiStatusHint(error.code) : null);
    } finally {
      setBusy(false);
    }
  }

  async function onPreview() {
    if (!selected) {
      setStatus('validation');
      setStatusHint('Save this broadcast first, then count this list.');
      return;
    }
    setBusy(true);
    try {
      const saved = await previewCampaign(selected.id, selected.version);
      applySaved(
        saved,
        `This list has ${saved.recipientCount ?? 0} patients. Nobody was sent a message.`,
      );
    } catch (error) {
      setStatus(isApiError(error) ? mapApiStatus(error) : 'failure');
      setStatusHint(isApiError(error) ? apiStatusHint(error.code) : null);
    } finally {
      setBusy(false);
    }
  }

  async function onReady() {
    if (!selected) {
      setStatus('validation');
      setStatusHint('Count this list before marking it ready to send.');
      return;
    }
    setBusy(true);
    try {
      const saved = await readyCampaign(selected.id, selected.version);
      applySaved(saved, `${saved.name} is ready. Send this list when the till is set.`);
    } catch (error) {
      setStatus(isApiError(error) ? mapApiStatus(error) : 'failure');
      setStatusHint(isApiError(error) ? apiStatusHint(error.code) : null);
    } finally {
      setBusy(false);
    }
  }

  async function onSend() {
    if (!selected || selected.status !== 'READY_FOR_DELIVERY') {
      setStatus('validation');
      setStatusHint('Freeze this list before sending the shop update.');
      return;
    }
    setBusy(true);
    try {
      const result = await sendCampaignMessages(selected.id);
      setSendHint(`${result.sent} sent · ${result.failed} failed · ${result.queued} queued`);
      setStatus('success');
      setStatusHint(
        `Sent this list: ${result.sent} sent, ${result.failed} failed. Open WhatsApp sends to retry.`,
      );
      addRef.current?.focus();
    } catch (error) {
      setStatus(isApiError(error) ? mapApiStatus(error) : 'failure');
      setStatusHint(isApiError(error) ? apiStatusHint(error.code) : null);
    } finally {
      setBusy(false);
    }
  }

  return {
    allowed,
    canSeeCa,
    status,
    statusHint,
    statusId,
    items,
    tags,
    templates,
    selected,
    creating,
    form,
    busy,
    sendHint,
    addRef,
    startCreate,
    selectCampaign,
    onChange,
    toggleTag,
    onSave,
    onPreview,
    onReady,
    onSend,
  };
}
