import { useState } from 'react';
import { translate } from '@namma-medmate/i18n';
import { Button, StatusBanner } from '@namma-medmate/shared-ui';
import { whatsappMessages } from '../i18n/en.ts';
import { useShareDeeplinkMutation } from '../store/api/whatsapp-api.ts';

export interface ShareWhatsAppButtonProps {
  text: string;
  to?: string;
  tenantId?: string;
  locationId?: string;
  skipMutation?: boolean;
  openUrl?: (url: string) => void;
}

export function ShareWhatsAppButton({
  text,
  to,
  tenantId,
  locationId,
  skipMutation = false,
  openUrl,
}: ShareWhatsAppButtonProps) {
  const [share] = useShareDeeplinkMutation();
  const [opened, setOpened] = useState(false);
  const [error, setError] = useState<string>();

  async function onShare(): Promise<void> {
    if (skipMutation) {
      openUrl?.('https://wa.me/');
      setOpened(true);
      setError(undefined);
      return;
    }
    const result = await share({ text, to, tenantId, locationId });
    if ('error' in result) {
      setError(translate(whatsappMessages, 'whatsapp.share.error'));
      setOpened(false);
      return;
    }
    launchUrl(openUrl, result.data.url);
    setOpened(true);
    setError(undefined);
  }

  return (
    <div className="space-y-2">
      <Button type="button" onClick={() => void onShare()}>
        {translate(whatsappMessages, 'whatsapp.share.button')}
      </Button>
      {opened ? <p role="status">{translate(whatsappMessages, 'whatsapp.share.opened')}</p> : null}
      {error ? <StatusBanner tone="error">{error}</StatusBanner> : null}
    </div>
  );
}

function launchUrl(openUrl: ((url: string) => void) | undefined, url: string): void {
  if (openUrl) {
    openUrl(url);
    return;
  }
  globalThis.window?.open(url, '_blank', 'noopener,noreferrer');
}
