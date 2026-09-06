import type { WhatsAppStructure } from '@/services/whatsappTemplates';
import { namespaceRule } from '../../WhatsappProviderScreen.utils';

export type ApprovedStructuresListProps = {
  items: WhatsAppStructure[];
};

export function ApprovedStructuresList({ items }: ApprovedStructuresListProps) {
  return (
    <div className="overflow-x-auto border border-line bg-surface">
      <table className="w-full min-w-[40rem] text-left text-sm">
        <caption className="sr-only">Meta-approved WhatsApp structures on the MASTER WABA</caption>
        <thead className="border-b border-line bg-elevated font-mono text-[11px] tracking-wide text-muted">
          <tr>
            <th className="px-3 py-2 font-medium">Unique name</th>
            <th className="px-3 py-2 font-medium">Tenant namespace</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Tenant slots</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <tr key={row.uniqueName} className="border-b border-line last:border-b-0">
              <td className="px-3 py-2.5 font-mono text-[12px] text-brand">{row.uniqueName}</td>
              <td className="px-3 py-2.5 font-mono text-[12px] text-ink">
                {namespaceRule(row.uniqueName)}
              </td>
              <td className="px-3 py-2.5 text-ink">{row.status}</td>
              <td className="px-3 py-2.5 text-muted">{row.tenantSlots.join(', ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
