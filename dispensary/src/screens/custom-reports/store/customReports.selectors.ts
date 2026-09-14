import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '@/store';
import type { CustomReportDataset } from '@/services/customReports';
export const selectCustomReportsSlice = (state: RootState) => state.customReports;

export const selectCrStatus = (state: RootState) => state.customReports.status;
export const selectCrStatusHint = (state: RootState) => state.customReports.statusHint;
export const selectCrPlanGate = (state: RootState) => state.customReports.planGate;
export const selectCrCatalog = (state: RootState) => state.customReports.catalog;
export const selectCrPreview = (state: RootState) => state.customReports.preview;
export const selectCrDatasetKey = (state: RootState) => state.customReports.dataset;
export const selectCrColumns = (state: RootState) => state.customReports.columns;
export const selectCrFilter = (state: RootState) => state.customReports.filter;
export const selectCrFrom = (state: RootState) => state.customReports.from;
export const selectCrTo = (state: RootState) => state.customReports.to;
export const selectCrScope = (state: RootState) => state.customReports.scope;
export const selectCrBusy = (state: RootState) => state.customReports.busy;
export const selectCrMode = (state: RootState) => state.customReports.mode;
export const selectCrCatalogQuery = (state: RootState) => state.customReports.catalogQuery;
export const selectCrCatalogChip = (state: RootState) => state.customReports.catalogChip;
export const selectCrBuilderTab = (state: RootState) => state.customReports.builderTab;

export const selectCrOperators = (state: RootState) =>
  state.customReports.catalog?.operators ?? [];

export const selectCrSelectedDataset = createSelector(
  [selectCrCatalog, selectCrDatasetKey],
  (catalog, key): CustomReportDataset | null =>
    catalog?.datasets.find((item) => item.key === key) ?? catalog?.datasets[0] ?? null,
);

export const selectCrFields = createSelector(
  selectCrSelectedDataset,
  (dataset) => dataset?.fields ?? [],
);

export const selectCrGroupedCatalog = createSelector(
  [selectCrCatalog, selectCrCatalogQuery, selectCrCatalogChip],
  (catalog, query, chip) => {
    const datasets = (catalog?.datasets ?? []).map((item) => ({
      ...item,
      group: item.group ?? fallbackGroup(item.key),
      favourite: item.favourite ?? (item.key === 'SALES' || item.key === 'STOCK'),
    }));
    const q = query.trim().toLowerCase();
    const filtered = datasets.filter((item) => {
      if (chip === 'Favourite' && !item.favourite) return false;
      if (chip !== 'All' && chip !== 'Favourite' && item.group !== chip) return false;
      if (!q) return true;
      return (
        item.label.toLowerCase().includes(q) ||
        item.key.toLowerCase().includes(q) ||
        item.group.toLowerCase().includes(q)
      );
    });

    const groups: { name: string; items: typeof datasets }[] = [];
    const favourites = filtered.filter((item) => item.favourite);
    if (favourites.length > 0 && (chip === 'All' || chip === 'Favourite')) {
      groups.push({ name: 'Favourite', items: favourites });
    }

    const seen = new Set<string>();
    for (const item of filtered) {
      if (chip === 'Favourite') continue;
      if (seen.has(item.group)) continue;
      seen.add(item.group);
      groups.push({
        name: item.group,
        items: filtered.filter((row) => row.group === item.group),
      });
    }
    return groups;
  },
);

function fallbackGroup(key: string): string {
  switch (key) {
    case 'STOCK':
      return 'Item';
    case 'CUSTOMERS':
      return 'Party';
    default:
      return 'Transaction';
  }
}
