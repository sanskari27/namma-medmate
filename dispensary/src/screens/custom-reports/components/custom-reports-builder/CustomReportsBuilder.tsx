import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store';
import { CUSTOM_REPORTS_CONTENT } from '../../CustomReportsScreen.content';
import { CustomReportsColumns } from '../custom-reports-columns';
import { CustomReportsDateBranch } from '../custom-reports-date-branch';
import { CustomReportsEmptyState } from '../custom-reports-empty-state';
import { CustomReportsFilters } from '../custom-reports-filters';
import { CustomReportsPreviewTable } from '../custom-reports-preview-table';
import {
  backToCatalog,
  builderTabChanged,
  loadCustomReportPreview,
  selectCrBuilderTab,
  selectCrBusy,
  selectCrColumns,
  selectCrFrom,
  selectCrPreview,
  selectCrSelectedDataset,
  selectCrStatus,
  selectCrTo,
  type BuilderTab,
} from '../../store';

export function CustomReportsBuilder({ owner }: { owner: boolean }) {
  const dispatch = useDispatch<AppDispatch>();
  const dataset = useSelector(selectCrSelectedDataset);
  const tab = useSelector(selectCrBuilderTab);
  const status = useSelector(selectCrStatus);
  const preview = useSelector(selectCrPreview);
  const columns = useSelector(selectCrColumns);
  const from = useSelector(selectCrFrom);
  const to = useSelector(selectCrTo);
  const busy = useSelector(selectCrBusy);

  useEffect(() => {
    if (columns.length === 0) return;
    void dispatch(loadCustomReportPreview());
  }, [columns.length, dataset?.key, dispatch]);

  const tabs: { key: BuilderTab; label: string }[] = [
    { key: 'columns', label: CUSTOM_REPORTS_CONTENT.tabs.columns },
    { key: 'filters', label: CUSTOM_REPORTS_CONTENT.tabs.filters },
    { key: 'preview', label: CUSTOM_REPORTS_CONTENT.tabs.preview },
  ];

  return (
    <>
      <div className="cr-tabs">
        <button type="button" className="cr-back" onClick={() => dispatch(backToCatalog())}>
          ← {CUSTOM_REPORTS_CONTENT.allReports}
        </button>
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`cr-tab${tab === item.key ? ' on' : ''}`}
            onClick={() => dispatch(builderTabChanged(item.key))}
          >
            {item.label}
          </button>
        ))}
      </div>

      <CustomReportsDateBranch owner={owner} />

      <p className="cr-showing">
        Showing: {dataset?.label ?? 'Report'} · {from} → {to}
        {preview ? ` · ${preview.rowCount} rows` : ''}
        {busy ? ' · loading…' : ''}
      </p>

      <div className="cr-stats" aria-label="Report summary">
        <article className="cr-stat">
          <div className="lbl">{CUSTOM_REPORTS_CONTENT.stats.dataset}</div>
          <div className="val" style={{ fontSize: 18 }}>
            {dataset?.label ?? '—'}
          </div>
        </article>
        <article className="cr-stat">
          <div className="lbl">{CUSTOM_REPORTS_CONTENT.stats.columns}</div>
          <div className="val">{columns.length}</div>
        </article>
        <article className="cr-stat">
          <div className="lbl">{CUSTOM_REPORTS_CONTENT.stats.rows}</div>
          <div className="val">{preview?.rowCount ?? 0}</div>
        </article>
        <article className="cr-stat">
          <div className="lbl">{CUSTOM_REPORTS_CONTENT.stats.truncated}</div>
          <div className="val" style={{ fontSize: 18 }}>
            {preview?.truncated ? 'Yes' : 'No'}
          </div>
        </article>
      </div>

      {tab === 'columns' ? <CustomReportsColumns /> : null}
      {tab === 'filters' ? <CustomReportsFilters /> : null}
      {tab === 'preview' ? (
        <>
          {status === 'success' && preview ? <CustomReportsPreviewTable /> : null}
          {status === 'empty' ? <CustomReportsEmptyState /> : null}
          {status === 'loading' ? (
            <div className="cr-loading" role="status">
              {CUSTOM_REPORTS_CONTENT.loading}
            </div>
          ) : null}
        </>
      ) : null}
    </>
  );
}
