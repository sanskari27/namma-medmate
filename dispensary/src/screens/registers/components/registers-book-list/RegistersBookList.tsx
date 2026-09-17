import type { ComplianceReportCatalogItem } from '@/services/complianceReports';
import { planLabel } from '../../RegistersScreen.utils';

export type RegistersBookListProps = {
  books: ComplianceReportCatalogItem[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
};

export function RegistersBookList({ books, selectedKey, onSelect }: RegistersBookListProps) {
  return (
    <div className="rg-card rg-list">
      {books.map((book) => (
        <button
          key={book.key}
          type="button"
          data-on={book.key === selectedKey}
          onClick={() => onSelect(book.key)}
        >
          <b>{book.title}</b>
          <span className="rg-muted rg-mono">{book.key}</span>
          {book.entitled === false ? (
            <span className="rg-muted">{planLabel(book.minPlan) ?? 'On higher plan'}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
