import { AuditEventTable, type AuditEventTableProps } from './audit-event-table.tsx';

export type HqAuditEventTableProps = Omit<AuditEventTableProps, 'showTenant'>;

export function HqAuditEventTable(props: HqAuditEventTableProps) {
  return <AuditEventTable {...props} showTenant />;
}
