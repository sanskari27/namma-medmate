import type { FinanceReportCatalogItem } from '@/services/financeReports';
import { shopBookTitle } from '../../ShopBooksScreen.utils';

export type ShopBooksBookListProps = {
  books: FinanceReportCatalogItem[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
};

export function ShopBooksBookList({ books, selectedKey, onSelect }: ShopBooksBookListProps) {
  return (
    <nav
      className="min-h-0 overflow-auto border border-line bg-surface"
      aria-label="Shop books in this outlet"
    >
      <ul>
        {books.map((book) => {
          const selected = book.key === selectedKey;
          const title = shopBookTitle(book.key, book.title);
          return (
            <li key={book.key} className="border-b border-line last:border-b-0">
              <button
                type="button"
                aria-label={title}
                aria-current={selected ? 'page' : undefined}
                className={`block w-full px-3 py-2 text-left text-sm ${
                  selected ? 'bg-brand-soft font-medium text-ink' : 'text-ink hover:bg-canvas'
                }`}
                onClick={() => onSelect(book.key)}
              >
                <span className="block">{title}</span>
                <span className="font-mono text-xs text-muted">{book.key}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
