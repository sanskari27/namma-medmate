import { translate } from '@namma-medmate/i18n';
import {
  StatusBanner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@namma-medmate/shared-ui';
import { auditMessages } from '../i18n/en.ts';
import { formatSnapshot, formatTarget } from '../lib/format.ts';
import { useListAuditEventsQuery, type AuditEventItem } from '../store/api/audit-api.ts';

export interface AuditEventTableProps {
  skipQuery?: boolean;
  items?: AuditEventItem[];
  error?: boolean;
  showTenant?: boolean;
}

export function AuditEventTable({
  skipQuery = false,
  items: seededItems = [],
  error = false,
  showTenant = false,
}: AuditEventTableProps) {
  const query = useListAuditEventsQuery(undefined, { skip: skipQuery });
  const items = skipQuery ? seededItems : (query.data?.items ?? []);
  const failed = error || (!skipQuery && query.isError);
  return (
    <section className="space-y-4">
      {failed ? (
        <StatusBanner tone="error">{translate(auditMessages, 'audit.table.error')}</StatusBanner>
      ) : null}
      {!failed && items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {translate(auditMessages, 'audit.table.empty')}
        </p>
      ) : null}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{translate(auditMessages, 'audit.table.time')}</TableHead>
            <TableHead>{translate(auditMessages, 'audit.table.actor')}</TableHead>
            <TableHead>{translate(auditMessages, 'audit.table.role')}</TableHead>
            <TableHead>{translate(auditMessages, 'audit.table.action')}</TableHead>
            <TableHead>{translate(auditMessages, 'audit.table.target')}</TableHead>
            {showTenant ? (
              <TableHead>{translate(auditMessages, 'audit.table.tenant')}</TableHead>
            ) : null}
            <TableHead>{translate(auditMessages, 'audit.table.before')}</TableHead>
            <TableHead>{translate(auditMessages, 'audit.table.after')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.audit_event_id}>
              <TableCell>{item.occurred_at}</TableCell>
              <TableCell>{item.actor_user_id}</TableCell>
              <TableCell>{item.actor_role}</TableCell>
              <TableCell>{item.action}</TableCell>
              <TableCell>{formatTarget(item.target_type, item.target_id)}</TableCell>
              {showTenant ? <TableCell>{item.tenant_id ?? ''}</TableCell> : null}
              <TableCell className="whitespace-normal">
                {item.money_or_stock ? formatSnapshot(item.before) : ''}
              </TableCell>
              <TableCell className="whitespace-normal">
                {item.money_or_stock ? formatSnapshot(item.after) : ''}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}
