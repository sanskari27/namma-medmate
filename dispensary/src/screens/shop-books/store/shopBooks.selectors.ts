import type { RootState } from '@/store';
import { catalogHint, catalogTitle, groupedCatalog, periodLabel } from '../ShopBooksScreen.utils';

export const selectShopBooksStatus = (state: RootState) => state.shopBooks.status;
export const selectShopBooksStatusHint = (state: RootState) => state.shopBooks.statusHint;
export const selectShopBooksPlanGate = (state: RootState) => state.shopBooks.planGate;
export const selectShopBooksUpgradeHint = (state: RootState) => state.shopBooks.upgradeHint;
export const selectShopBooksBooks = (state: RootState) => state.shopBooks.books;
export const selectShopBooksSelectedKey = (state: RootState) => state.shopBooks.selectedKey;
export const selectShopBooksTable = (state: RootState) => state.shopBooks.table;
export const selectShopBooksSearch = (state: RootState) => state.shopBooks.search;
export const selectShopBooksChip = (state: RootState) => state.shopBooks.chip;
export const selectShopBooksPeriod = (state: RootState) => state.shopBooks.period;
export const selectShopBooksScope = (state: RootState) => state.shopBooks.scope;
export const selectShopBooksBusy = (state: RootState) => state.shopBooks.busy;

export const selectShopBooksGroups = (state: RootState) =>
  groupedCatalog(state.shopBooks.books, state.shopBooks.search, state.shopBooks.chip);

export const selectShopBooksPeriodLabel = (state: RootState) => periodLabel(state.shopBooks.period);

export const selectSelectedBook = (state: RootState) =>
  state.shopBooks.books.find((book) => book.key === state.shopBooks.selectedKey) ?? null;

export const selectSelectedTitle = (state: RootState) => {
  const book = selectSelectedBook(state);
  if (!book) {
    return 'Shop book';
  }
  return catalogTitle(book.key, book.title);
};

export const selectSelectedHint = (state: RootState) => {
  const key = state.shopBooks.selectedKey;
  return key ? catalogHint(key) : '';
};
