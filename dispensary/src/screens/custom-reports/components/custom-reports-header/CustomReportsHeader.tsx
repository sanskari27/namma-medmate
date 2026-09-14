import { Link } from 'react-router-dom';
import { FileDown, Printer } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store';
import { ROUTES } from '@/libs/constants/routes.const';
import { CUSTOM_REPORTS_CONTENT } from '../../CustomReportsScreen.content';
import {
  exportCustomReport,
  selectCrBusy,
  selectCrMode,
  selectCrPlanGate,
} from '../../store';

export function CustomReportsHeader() {
  const dispatch = useDispatch<AppDispatch>();
  const planGate = useSelector(selectCrPlanGate);
  const busy = useSelector(selectCrBusy);
  const mode = useSelector(selectCrMode);

  return (
    <header className="cr-head">
      <h1>{CUSTOM_REPORTS_CONTENT.title}</h1>
      {planGate ? (
        <div>
          <p>
            {mode === 'catalog'
              ? CUSTOM_REPORTS_CONTENT.catalogSubtitle
              : CUSTOM_REPORTS_CONTENT.subtitle}
            . Growth unlocks this builder.
          </p>
          <Link
            className="cr-link"
            to={ROUTES.SUBSCRIPTION}
            style={{ display: 'inline-block', marginTop: 8 }}
          >
            {CUSTOM_REPORTS_CONTENT.openPlan}
          </Link>
        </div>
      ) : null}
      {planGate || mode === 'catalog' ? null : (
        <div className="cr-head-actions">
          <button
            type="button"
            className="cr-btn cr-btn-ghost"
            disabled={busy}
            onClick={() => void dispatch(exportCustomReport('csv'))}
          >
            <FileDown className="size-4" aria-hidden />
            {CUSTOM_REPORTS_CONTENT.exportSheet}
          </button>
          <button
            type="button"
            className="cr-btn"
            disabled={busy}
            onClick={() => void dispatch(exportCustomReport('pdf'))}
          >
            <Printer className="size-4" aria-hidden />
            {CUSTOM_REPORTS_CONTENT.exportPdf}
          </button>
        </div>
      )}
    </header>
  );
}
