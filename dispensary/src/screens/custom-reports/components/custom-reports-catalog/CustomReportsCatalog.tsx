import { Search, Star, Box, Users, Receipt } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store';
import {
  CATALOG_FILTER_CHIPS,
  CUSTOM_REPORTS_CONTENT,
  type CatalogFilterChip,
} from '../../CustomReportsScreen.content';
import {
  catalogChipChanged,
  catalogQueryChanged,
  openDataset,
  selectCrBusy,
  selectCrCatalogChip,
  selectCrCatalogQuery,
  selectCrGroupedCatalog,
} from '../../store';

function groupIcon(name: string) {
  switch (name) {
    case 'Favourite':
      return Star;
    case 'Item':
      return Box;
    case 'Party':
      return Users;
    default:
      return Receipt;
  }
}

export function CustomReportsCatalog() {
  const dispatch = useDispatch<AppDispatch>();
  const groups = useSelector(selectCrGroupedCatalog);
  const query = useSelector(selectCrCatalogQuery);
  const chip = useSelector(selectCrCatalogChip);
  const busy = useSelector(selectCrBusy);

  return (
    <>
      <div className="cr-toolbar" aria-label={CUSTOM_REPORTS_CONTENT.filterBy}>
        <span style={{ color: 'var(--cr-muted)', fontSize: 12.5, fontWeight: 700 }}>
          {CUSTOM_REPORTS_CONTENT.filterBy}
        </span>
        {CATALOG_FILTER_CHIPS.map((item) => (
          <button
            key={item}
            type="button"
            className={`cr-chip${chip === item ? ' on' : ''}`}
            disabled={busy}
            onClick={() => dispatch(catalogChipChanged(item as CatalogFilterChip))}
          >
            {item}
          </button>
        ))}
        <label className="cr-search">
          <Search className="ic size-4" aria-hidden />
          <input
            value={query}
            placeholder={CUSTOM_REPORTS_CONTENT.findReport}
            disabled={busy}
            onChange={(event) => dispatch(catalogQueryChanged(event.target.value))}
            aria-label={CUSTOM_REPORTS_CONTENT.findReport}
          />
        </label>
      </div>

      {groups.length === 0 ? (
        <p className="cr-empty">{CUSTOM_REPORTS_CONTENT.noMatches}</p>
      ) : (
        <div className="cr-report-grid">
          {groups.map((group) => {
            const Icon = groupIcon(group.name);
            return (
              <div key={group.name} className="cr-report-col">
                <div className="cr-report-head">
                  <Icon className="size-4" aria-hidden />
                  {group.name}
                </div>
                {group.items.map((item) => (
                  <button
                    key={`${group.name}-${item.key}`}
                    type="button"
                    className="cr-report-row"
                    disabled={busy}
                    onClick={() => dispatch(openDataset(item.key))}
                  >
                    <span className="nm">{item.label}</span>
                    {item.favourite ? <span className="star" aria-label="Favourite">★</span> : null}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
