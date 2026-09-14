import type { RootState } from '@/store';
import { lastName, selectedCount } from '../CaPackScreen.utils';

export const selectCaPackStatus = (state: RootState) => state.caPack.status;
export const selectCaPackStatusHint = (state: RootState) => state.caPack.statusHint;
export const selectCaPackPack = (state: RootState) => state.caPack.pack;
export const selectCaPackGstin = (state: RootState) => state.caPack.gstin;
export const selectCaPackPeriodKey = (state: RootState) => state.caPack.periodKey;
export const selectCaPackScope = (state: RootState) => state.caPack.scope;
export const selectCaPackEnabled = (state: RootState) => state.caPack.enabled;
export const selectCaPackAdvisorId = (state: RootState) => state.caPack.advisorId;
export const selectCaPackAdvisors = (state: RootState) => state.caPack.advisors;
export const selectCaPackHistory = (state: RootState) => state.caPack.history;
export const selectCaPackFormOpen = (state: RootState) => state.caPack.formOpen;
export const selectCaPackForm = (state: RootState) => state.caPack.form;
export const selectCaPackBusy = (state: RootState) => state.caPack.busy;

export const selectActiveAdvisor = (state: RootState) =>
  state.caPack.advisors.find((row) => row.id === state.caPack.advisorId) ?? null;

export const selectShareCount = (state: RootState) => selectedCount(state.caPack.enabled);

export const selectShareLabel = (state: RootState) => {
  const count = selectShareCount(state);
  const advisor = selectActiveAdvisor(state);
  if (!advisor) {
    return count === 1 ? 'Download 1 report' : `Download ${count} reports`;
  }
  return count === 1
    ? `Share 1 report with ${lastName(advisor.name)}`
    : `Share ${count} reports with ${lastName(advisor.name)}`;
};

export const selectSnapshot = (state: RootState) => {
  const pack = state.caPack.pack;
  const sales = pack?.sections.find((row) => row.key === 'SALES_SUMMARY');
  const gst = pack?.sections.find((row) => row.key === 'GSTR3B');
  const revenue =
    sales?.totals.find((row) => row.key === 'total')?.amountPaise ??
    sales?.items.reduce((sum, item) => sum + Number(item.totalPaise || item.amountPaise || 0), 0) ??
    0;
  const output =
    gst?.totals.find((row) => row.key === 'outwardTaxable' || row.key === 'outwardTaxablePaise')
      ?.amountPaise ?? 0;
  const input = gst?.totals.find((row) => row.key === 'itc' || row.key === 'itcPaise')?.amountPaise ?? 0;
  const payable =
    gst?.totals.find((row) => row.key === 'payable' || row.key === 'payablePaise')?.amountPaise ??
    output - input;
  return {
    gstin: state.caPack.gstin,
    revenue,
    output,
    input,
    payable,
  };
};
