import { useState } from 'react';
import { translate } from '@namma-medmate/i18n';
import { Button, StatusBanner } from '@namma-medmate/shared-ui';
import { useWhatsAppMandatoryChanged } from '../hooks/use-whatsapp-events.ts';
import { whatsappMessages } from '../i18n/en.ts';
import { mandatoryBannerCopy } from '../lib/copy.ts';
import {
  useAcknowledgeMessageMutation,
  useListMandatoryFailuresQuery,
  type MandatoryFailure,
} from '../store/api/whatsapp-api.ts';

export interface MandatoryWhatsAppBannerProps {
  skipQuery?: boolean;
  skipMutation?: boolean;
  canAcknowledge?: boolean;
  locationId?: string;
  items?: MandatoryFailure[];
}

export function MandatoryWhatsAppBanner({
  skipQuery = false,
  skipMutation = false,
  canAcknowledge = true,
  locationId,
  items: seededItems = [],
}: MandatoryWhatsAppBannerProps) {
  const query = useListMandatoryFailuresQuery(undefined, { skip: skipQuery });
  const [acknowledge] = useAcknowledgeMessageMutation();
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [localError, setLocalError] = useState<string>();
  const remoteItems = query.data?.items ?? [];
  const source = skipQuery ? seededItems : remoteItems;
  const items = source.filter((item) => !hiddenIds.includes(item.message_id));
  useWhatsAppMandatoryChanged(locationId, items.length);

  const lead = items[0];
  if (!lead) {
    return null;
  }

  async function onAcknowledge(messageId: string): Promise<void> {
    if (!canAcknowledge) {
      setLocalError(translate(whatsappMessages, 'whatsapp.errors.forbiddenRole'));
      return;
    }
    if (skipMutation) {
      setHiddenIds((current) => [...current, messageId]);
      setLocalError(undefined);
      return;
    }
    const result = await acknowledge({ messageId });
    if ('error' in result) {
      setLocalError(translate(whatsappMessages, 'whatsapp.errors.forbiddenRole'));
      return;
    }
    setHiddenIds((current) => [...current, messageId]);
    setLocalError(undefined);
  }

  return (
    <div className="border-b border-border bg-destructive/5 px-5 py-4">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <StatusBanner tone="error">{mandatoryBannerCopy(lead.template_key)}</StatusBanner>
          <ul className="list-disc pl-5 text-sm text-foreground">
            {items.map((item) => (
              <li key={item.message_id}>{item.bill_id ?? item.template_key}</li>
            ))}
          </ul>
          {localError ? <StatusBanner tone="error">{localError}</StatusBanner> : null}
        </div>
        <Button type="button" onClick={() => void onAcknowledge(lead.message_id)}>
          {translate(whatsappMessages, 'whatsapp.banner.acknowledge')}
        </Button>
      </div>
    </div>
  );
}
