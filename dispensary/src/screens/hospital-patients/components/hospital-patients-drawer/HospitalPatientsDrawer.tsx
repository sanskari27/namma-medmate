import { Button } from '@atoms';
import type { HospitalActivePatientDetail } from '@/services/hospital';
import { HOSPITAL_PATIENTS_CONTENT } from '../../HospitalPatientsScreen.content';
import { formatPaise, type SettleDraft } from '../../HospitalPatientsScreen.utils';
import { HospitalPatientsInvoiceTable } from '../hospital-patients-invoice-table';
import { HospitalPatientsSettleFields } from '../hospital-patients-settle-fields';

type Props = {
  detail: HospitalActivePatientDetail | null;
  draft: SettleDraft;
  busy: boolean;
  canDischarge: boolean;
  onDraftChange: (draft: SettleDraft) => void;
  onSettle: () => void;
  onDischarge: () => void;
};

export function HospitalPatientsDrawer({
  detail,
  draft,
  busy,
  canDischarge,
  onDraftChange,
  onSettle,
  onDischarge,
}: Props) {
  if (!detail) {
    return (
      <section className="hp-panel" aria-label={HOSPITAL_PATIENTS_CONTENT.drawerLabel}>
        <p className="hp-empty">{HOSPITAL_PATIENTS_CONTENT.selectPatient}</p>
      </section>
    );
  }

  return (
    <section className="hp-panel" aria-label={HOSPITAL_PATIENTS_CONTENT.drawerLabel}>
      <div className="hp-drawer">
        <header>
          <h2 className="font-serif text-lg text-ink">{detail.patientName}</h2>
          <p className="hp-mono text-sm text-muted">{detail.uhid}</p>
          <p className="text-sm text-muted">{detail.locationLabel}</p>
        </header>
        <dl className="hp-totals">
          <div>
            <dt>{HOSPITAL_PATIENTS_CONTENT.unpaidLabel}</dt>
            <dd className="hp-mono">{formatPaise(detail.unpaidPaise)}</dd>
          </div>
          <div>
            <dt>{HOSPITAL_PATIENTS_CONTENT.settledLabel}</dt>
            <dd className="hp-mono">{formatPaise(detail.settledPaise)}</dd>
          </div>
          <div>
            <dt>{HOSPITAL_PATIENTS_CONTENT.billsLabel}</dt>
            <dd>{detail.billCount}</dd>
          </div>
        </dl>
        <HospitalPatientsInvoiceTable invoices={detail.invoices} />
        {detail.unpaidPaise > 0 ? (
          <>
            <HospitalPatientsSettleFields
              idPrefix="hp-settle"
              draft={draft}
              disabled={busy}
              onChange={onDraftChange}
            />
            <div className="hp-actions">
              <Button type="button" disabled={busy} onClick={onSettle}>
                {HOSPITAL_PATIENTS_CONTENT.postSettlement}
              </Button>
              {canDischarge && detail.kind === 'ADMISSION' ? (
                <Button type="button" variant="outline" disabled={busy} onClick={onDischarge}>
                  {HOSPITAL_PATIENTS_CONTENT.discharge}
                </Button>
              ) : null}
            </div>
          </>
        ) : (
          <div className="hp-actions">
            {canDischarge && detail.kind === 'ADMISSION' && detail.status === 'ACTIVE' ? (
              <Button type="button" disabled={busy} onClick={onDischarge}>
                {HOSPITAL_PATIENTS_CONTENT.discharge}
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
