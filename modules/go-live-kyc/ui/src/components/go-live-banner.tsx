import { StatusBanner } from '@namma-medmate/shared-ui';
import { t } from '../lib/copy.ts';
import { useGetGateQuery, type GateData } from '../store/api/go-live-kyc-api.ts';

export interface GoLiveBannerProps {
  skipQuery?: boolean;
  gate?: GateData;
  locationId?: string;
}

export function GoLiveBanner({ skipQuery = false, gate, locationId = '' }: GoLiveBannerProps) {
  const query = useGetGateQuery(undefined, { skip: skipQuery || !locationId });
  const data = gate ?? query.data;
  if (!data || data.allowed) {
    return null;
  }
  return <StatusBanner tone="info">{t('goLiveKyc.banner.setup')}</StatusBanner>;
}
