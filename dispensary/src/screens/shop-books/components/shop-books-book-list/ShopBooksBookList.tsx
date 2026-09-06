import type { FinanceReportCatalogItem } from '@/services/financeReports';
import { planLabel, shopBookTitle } from '../../ShopBooksScreen.utils';

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
          const gated = book.entitled === false;
          const plan = gated ? planLabel(book.minPlan) : null;
          return (
            <li key={book.key} className="border-b border-line last:border-b-0">
              <button
                type="button"
                aria-label={plan ? `${title}, ${plan}` : title}
                aria-current={selected ? 'page' : undefined}
                className={`block w-full px-3 py-2 text-left text-sm ${
                  selected ? 'bg-brand-soft font-medium text-ink' : 'text-ink hover:bg-canvas'
                }`}
                onClick={() => onSelect(book.key)}
              >
                <span className="block">{title}</span>
                <span className="font-mono text-xs text-muted">{book.key}</span>
                {plan ? <span className="mt-0.5 block text-xs text-muted">{plan}</span> : null}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
