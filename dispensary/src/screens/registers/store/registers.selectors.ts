import type { RootState } from '@/store';
import { bookEntitled } from '../RegistersScreen.utils';

export const selectRegistersStatus = (state: RootState) => state.registers.status;
export const selectRegistersHint = (state: RootState) => state.registers.statusHint;
export const selectRegistersBooks = (state: RootState) => state.registers.books;
export const selectRegistersSelectedKey = (state: RootState) => state.registers.selectedKey;
export const selectRegistersTable = (state: RootState) => state.registers.table;
export const selectRegistersFilters = (state: RootState) => state.registers.filters;
export const selectRegistersBusy = (state: RootState) => state.registers.busy;
export const selectRegistersSelectedBook = (state: RootState) =>
  state.registers.books.find((book) => book.key === state.registers.selectedKey) ?? null;
export const selectRegistersShowBatch = (state: RootState) =>
  selectRegistersSelectedBook(state)?.filters.includes('batchNumber') === true;
export const selectRegistersPlanGate = (state: RootState) => {
  const book = selectRegistersSelectedBook(state);
  return (book != null && !bookEntitled(book)) || state.registers.planLimit;
};
export const selectRegistersUpgradeHint = (state: RootState) =>
  selectRegistersSelectedBook(state)?.upgradeHint ?? null;
