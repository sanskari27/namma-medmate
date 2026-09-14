import type { RootState } from '@/store';
import type { ControlledSaleLine } from '@/services/controlledRegister';

function uniqueOptions(
  items: ControlledSaleLine[],
  idOf: (row: ControlledSaleLine) => string,
  labelOf: (row: ControlledSaleLine) => string,
) {
  const seen = new Map<string, string>();
  for (const row of items) {
    const id = idOf(row);
    if (!seen.has(id)) {
      seen.set(id, labelOf(row));
    }
  }
  return [...seen.entries()].map(([id, label]) => ({ id, label }));
}

export const selectNdpsStatus = (state: RootState) => state.controlledRegister.status;
export const selectNdpsHint = (state: RootState) => state.controlledRegister.statusHint;
export const selectNdpsItems = (state: RootState) => state.controlledRegister.items;
export const selectNdpsFilters = (state: RootState) => state.controlledRegister.filters;
export const selectNdpsBusy = (state: RootState) => state.controlledRegister.busy;
export const selectNdpsProducts = (state: RootState) =>
  uniqueOptions(state.controlledRegister.items, (row) => row.productId, (row) => row.productName);
export const selectNdpsPatients = (state: RootState) =>
  uniqueOptions(state.controlledRegister.items, (row) => row.patientId, (row) => row.patientName);
export const selectNdpsPharmacists = (state: RootState) =>
  uniqueOptions(
    state.controlledRegister.items,
    (row) => row.pharmacistUserId,
    (row) => row.pharmacistName,
  );
