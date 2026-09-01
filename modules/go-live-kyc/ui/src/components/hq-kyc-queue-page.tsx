import { useState } from 'react';
import {
  Button,
  Input,
  StatusBanner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@namma-medmate/shared-ui';
import { t } from '../lib/copy.ts';
import {
  useApproveKycMutation,
  useListQueueQuery,
  useRejectKycMutation,
  type QueueItem,
} from '../store/api/go-live-kyc-api.ts';

export interface HqKycQueuePageProps {
  skipQuery?: boolean;
  error?: boolean;
  items?: QueueItem[];
}

export function HqKycQueuePage({
  skipQuery = false,
  error = false,
  items: seeded,
}: HqKycQueuePageProps) {
  const query = useListQueueQuery(undefined, { skip: skipQuery });
  const [approve] = useApproveKycMutation();
  const [reject] = useRejectKycMutation();
  const [reason, setReason] = useState('Drug licence does not match GSTIN legal name.');
  const [failed, setFailed] = useState(false);
  const items = seeded ?? query.data?.items ?? [];
  const showError = error || query.isError || failed;

  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-3xl font-semibold text-ink">{t('goLiveKyc.hq.title')}</h1>
      {showError ? <StatusBanner tone="error">{t('goLiveKyc.hq.error')}</StatusBanner> : null}
      {items.length === 0 && !showError ? (
        <p>{t('goLiveKyc.hq.empty')}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('goLiveKyc.hq.pharmacy')}</TableHead>
              <TableHead>{t('goLiveKyc.hq.gstin')}</TableHead>
              <TableHead>{t('goLiveKyc.hq.plan')}</TableHead>
              <TableHead>{t('goLiveKyc.hq.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={`${item.tenant_id}:${item.location_id}`}>
                <TableCell>{item.pharmacy_name}</TableCell>
                <TableCell>{item.gstin ?? '—'}</TableCell>
                <TableCell>{item.plan ?? '—'}</TableCell>
                <TableCell className="flex gap-2">
                  <Button
                    type="button"
                    onClick={() => {
                      setFailed(false);
                      void approve({
                        tenantId: item.tenant_id,
                        locationId: item.location_id,
                      })
                        .unwrap()
                        .catch(() => setFailed(true));
                    }}
                  >
                    {t('goLiveKyc.hq.approve')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setFailed(false);
                      void reject({
                        tenantId: item.tenant_id,
                        locationId: item.location_id,
                        reason,
                      })
                        .unwrap()
                        .catch(() => setFailed(true));
                    }}
                  >
                    {t('goLiveKyc.hq.reject')}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <Input
        aria-label={t('goLiveKyc.hq.reason')}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
      />
    </section>
  );
}
