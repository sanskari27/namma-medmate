import type { ReactNode } from 'react';
import { FileText, Receipt, Search, Sparkles } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store';
import { FILTER_CHIPS, SHOP_BOOKS_CONTENT, type FilterChipId } from '../../ShopBooksScreen.content';
import { catalogTitle, planLabel, REPORT_META } from '../../ShopBooksScreen.utils';
import {
  bookSelected,
  chipChanged,
  searchChanged,
  selectShopBooksChip,
  selectShopBooksGroups,
  selectShopBooksSearch,
  selectShopBooksStatus,
} from '../../store';
import type { FinanceReportCatalogItem } from '@/services/financeReports';

export function ShopBooksCatalog() {
  const dispatch = useDispatch<AppDispatch>();
  const search = useSelector(selectShopBooksSearch);
  const chip = useSelector(selectShopBooksChip);
  const groups = useSelector(selectShopBooksGroups);
  const status = useSelector(selectShopBooksStatus);
  const empty =
    groups.favourite.length + groups.gst.length + groups.transaction.length === 0;

  return (
    <>
      <div className="bk-toolbar">
        <div className="bk-chips">
          <span className="bk-chip-label">{SHOP_BOOKS_CONTENT.filterBy}</span>
          {FILTER_CHIPS.map((row) => (
            <button
              key={row.id}
              type="button"
              className="bk-chip"
              data-active={chip === row.id}
              onClick={() => dispatch(chipChanged(row.id as FilterChipId))}
            >
              {row.label}
            </button>
          ))}
        </div>
        <div className="bk-toolbar-spacer" />
        <label className="bk-search">
          <Search size={15} aria-hidden />
          <input
            type="search"
            value={search}
            placeholder={SHOP_BOOKS_CONTENT.findReport}
            aria-label={SHOP_BOOKS_CONTENT.findReport}
            onChange={(event) => dispatch(searchChanged(event.target.value))}
          />
        </label>
      </div>

      {status === 'loading' && empty ? (
        <p className="bk-loading">{SHOP_BOOKS_CONTENT.loading}</p>
      ) : (
        <div className="bk-groups">
          <CatalogGroup
            icon={<Sparkles size={15} aria-hidden />}
            title={SHOP_BOOKS_CONTENT.favourite}
            books={groups.favourite}
            forceStar
          />
          <CatalogGroup
            icon={<Receipt size={15} aria-hidden />}
            title={SHOP_BOOKS_CONTENT.gst}
            books={groups.gst}
          />
          <CatalogGroup
            icon={<FileText size={15} aria-hidden />}
            title={SHOP_BOOKS_CONTENT.transaction}
            books={groups.transaction}
          />
        </div>
      )}
    </>
  );
}

function CatalogGroup({
  icon,
  title,
  books,
  forceStar = false,
}: {
  icon: ReactNode;
  title: string;
  books: FinanceReportCatalogItem[];
  forceStar?: boolean;
}) {
  const dispatch = useDispatch<AppDispatch>();
  return (
    <section className="bk-group">
      <h3>
        {icon}
        {title}
      </h3>
      {books.map((book) => (
        <button
          key={`${title}-${book.key}`}
          type="button"
          className="bk-report"
          data-gated={book.entitled === false}
          onClick={() => dispatch(bookSelected(book.key))}
        >
          {catalogTitle(book.key, book.title)}
          {forceStar || REPORT_META[book.key]?.favourite ? (
            <span className="bk-star" aria-hidden>
              ★
            </span>
          ) : null}
          {book.entitled === false ? <span className="bk-hint">{planLabel(book.minPlan)}</span> : null}
        </button>
      ))}
    </section>
  );
}
