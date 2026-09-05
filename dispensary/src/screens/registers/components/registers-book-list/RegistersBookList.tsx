import type { ComplianceReportCatalogItem } from '@/services/complianceReports';

export type RegistersBookListProps = {
  books: ComplianceReportCatalogItem[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
};

export function RegistersBookList({ books, selectedKey, onSelect }: RegistersBookListProps) {
  return (
    <nav
      className="min-h-0 overflow-auto border border-line bg-surface"
      aria-label="Books in this outlet"
    >
      <ul>
        {books.map((book) => {
          const selected = book.key === selectedKey;
          return (
            <li key={book.key} className="border-b border-line last:border-b-0">
              <button
                type="button"
                aria-current={selected ? 'page' : undefined}
                className={`block w-full px-3 py-2 text-left text-sm ${
                  selected ? 'bg-brand-soft font-medium text-ink' : 'text-ink hover:bg-canvas'
                }`}
                onClick={() => onSelect(book.key)}
              >
                <span className="block">{book.title}</span>
                <span className="font-mono text-xs text-muted">{book.key}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
