import type { CaPackSection } from '@/services/caPack';
import { cellValue, columnLabel, formatPaise, sectionTitle } from '../../CaPackScreen.utils';

export type CaPackSectionListProps = {
  sections: CaPackSection[];
};

export function CaPackSectionList({ sections }: CaPackSectionListProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto">
      {sections.map((section) => {
        const title = sectionTitle(section.key, section.title);
        return (
          <section
            key={section.key}
            className="border border-line bg-surface"
            aria-label={title}
          >
            <header className="border-b border-line px-3 py-2">
              <h2 className="text-sm font-semibold text-ink">{title}</h2>
              {section.totals.length > 0 ? (
                <dl className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                  {section.totals.map((total) => (
                    <div key={total.key} className="flex gap-1">
                      <dt>{total.label}</dt>
                      <dd className="font-mono tabular-nums text-ink">
                        {formatPaise(total.amountPaise)}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </header>
            {section.items.length === 0 ? (
              <p className="px-3 py-3 text-sm text-muted">No rows in this section.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs text-muted">
                    <tr className="border-b border-line">
                      {section.columns.map((column) => (
                        <th key={column} className="px-3 py-2 font-medium">
                          {columnLabel(column)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {section.items.map((item, index) => (
                      <tr
                        key={`${section.key}-${index}`}
                        className="border-b border-line last:border-b-0"
                      >
                        {section.columns.map((column) => (
                          <td
                            key={column}
                            className={`px-3 py-2 text-ink ${
                              column.endsWith('Paise') ? 'font-mono tabular-nums' : ''
                            }`}
                          >
                            {cellValue(column, item[column])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
