import { useState } from 'react';
import {
  Badge,
  Button,
  Input,
  StatusBanner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@namma-medmate/shared-ui';
import { positionLabel, statusLabel, t } from '../lib/copy.ts';
import { downloadTextFile } from '../lib/download.ts';
import { EMPLOYEE_POSITIONS, EMPLOYEE_STATUSES } from '../lib/options.ts';
import { AddEmployeeDialog } from './add-employee-dialog.tsx';
import { EmployeeDrawer } from './employee-drawer.tsx';
import {
  useExportCsvMutation,
  useGetSummaryQuery,
  useListEmployeesQuery,
  type EmployeeDetail,
  type EmployeeListItem,
  type EmployeeSummary,
} from '../store/api/employees-api.ts';

export interface EmployeesPageProps {
  skipQuery?: boolean;
  planLocked?: boolean;
  summary?: EmployeeSummary;
  items?: EmployeeListItem[];
  error?: boolean;
  addOpen?: boolean;
  selectedEmployeeId?: string;
  selectedEmployee?: EmployeeDetail;
  locationId?: string;
}

const EMPTY_SUMMARY: EmployeeSummary = {
  headcount: { total: 0, active: 0, inactive: 0, separated: 0 },
  composition: [],
};

function matchesFilters(
  item: EmployeeListItem,
  q: string,
  position: string,
  status: string,
): boolean {
  if (position && item.position !== position) {
    return false;
  }
  if (status && item.status !== status) {
    return false;
  }
  if (!q) {
    return true;
  }
  const haystack = `${item.full_name} ${item.phone} ${item.employee_code}`.toLowerCase();
  return haystack.includes(q.toLowerCase());
}

export function EmployeesPage({
  skipQuery = false,
  planLocked = false,
  summary: seededSummary,
  items: seededItems = [],
  error = false,
  addOpen = false,
  selectedEmployeeId,
  selectedEmployee,
  locationId = '',
}: EmployeesPageProps) {
  const [q, setQ] = useState('');
  const [position, setPosition] = useState('');
  const [status, setStatus] = useState('');
  const filters = {
    q: q || undefined,
    position: position || undefined,
    status: status || undefined,
  };
  const summaryQuery = useGetSummaryQuery(undefined, { skip: skipQuery });
  const listQuery = useListEmployeesQuery(filters, { skip: skipQuery });
  const [exportCsv] = useExportCsvMutation();
  const summary = skipQuery
    ? (seededSummary ?? EMPTY_SUMMARY)
    : (summaryQuery.data ?? EMPTY_SUMMARY);
  const loadedItems = skipQuery ? seededItems : (listQuery.data?.items ?? []);
  const items = skipQuery
    ? loadedItems.filter((item) => matchesFilters(item, q, position, status))
    : loadedItems;
  const failed = error || (!skipQuery && (summaryQuery.isError || listQuery.isError));
  const [modalOpen, setModalOpen] = useState(addOpen);
  const [drawerId, setDrawerId] = useState<string | undefined>(selectedEmployeeId);
  const selected =
    selectedEmployee && selectedEmployee.employee_id === drawerId ? selectedEmployee : undefined;
  const activeTotal = summary.composition.reduce((sum, row) => sum + row.count, 0) || 1;

  if (planLocked) {
    return (
      <section className="space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          {t('employees.lock.title')}
        </h1>
        <p className="text-base leading-7 text-muted-foreground">{t('employees.lock.body')}</p>
      </section>
    );
  }

  async function handleExport(): Promise<void> {
    if (skipQuery) {
      downloadTextFile(
        'employees.csv',
        '\uFEFFemployee_code,full_name\n',
        'text/csv;charset=utf-8',
      );
      return;
    }
    const result = await exportCsv(filters);
    if (!('error' in result) && result.data) {
      downloadTextFile('employees.csv', result.data, 'text/csv;charset=utf-8');
    }
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            {t('employees.list.title')}
          </h1>
          <p className="text-sm text-muted-foreground">{t('employees.list.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => void handleExport()}>
            {t('employees.list.export')}
          </Button>
          <Button type="button" onClick={() => setModalOpen(true)}>
            {t('employees.list.add')}
          </Button>
        </div>
      </header>
      <div className="grid gap-3 sm:grid-cols-4">
        {(
          [
            ['total', summary.headcount.total],
            ['active', summary.headcount.active],
            ['inactive', summary.headcount.inactive],
            ['separated', summary.headcount.separated],
          ] as const
        ).map(([key, count]) => (
          <div key={key} className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">{t(`employees.kpi.${key}`)}</p>
            <p className="text-2xl font-semibold">{count}</p>
          </div>
        ))}
      </div>
      <div className="space-y-2" aria-label={t('employees.list.composition')}>
        {summary.composition.map((row) => (
          <div key={row.position} className="space-y-1">
            <p className="text-sm text-muted-foreground">
              {t('employees.composition.label', {
                position: positionLabel(row.position),
                count: String(row.count),
              })}
            </p>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-cta"
                style={{ width: `${Math.round((row.count / activeTotal) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          aria-label={t('employees.list.search')}
          placeholder={t('employees.list.search')}
          value={q}
          onChange={(event) => setQ(event.target.value)}
        />
        <select
          aria-label={t('employees.list.position')}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={position}
          onChange={(event) => setPosition(event.target.value)}
        >
          <option value="">{t('employees.filter.all')}</option>
          {EMPLOYEE_POSITIONS.map((item) => (
            <option key={item} value={item}>
              {t(`employees.positions.${item}`)}
            </option>
          ))}
        </select>
        <select
          aria-label={t('employees.list.status')}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="">{t('employees.filter.all')}</option>
          {EMPLOYEE_STATUSES.map((item) => (
            <option key={item} value={item}>
              {t(`employees.statuses.${item}`)}
            </option>
          ))}
        </select>
      </div>
      {failed ? <StatusBanner tone="error">{t('employees.list.error')}</StatusBanner> : null}
      {items.length === 0 && !failed ? (
        <p className="text-sm text-muted-foreground">{t('employees.list.empty')}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('employees.list.photo')}</TableHead>
              <TableHead>{t('employees.list.name')}</TableHead>
              <TableHead>{t('employees.list.position')}</TableHead>
              <TableHead>{t('employees.list.status')}</TableHead>
              <TableHead>{t('employees.list.phone')}</TableHead>
              <TableHead>{t('employees.list.login')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.employee_id}>
                <TableCell>
                  {item.photo_url ? (
                    <img
                      src={item.photo_url}
                      alt=""
                      className="size-10 rounded-full object-cover"
                    />
                  ) : null}
                </TableCell>
                <TableCell>
                  <button
                    type="button"
                    className="text-left font-medium"
                    onClick={() => setDrawerId(item.employee_id)}
                  >
                    {t('employees.list.open', { name: item.full_name })}
                  </button>
                  {item.pharmacist_eligible ? (
                    <Badge variant="secondary" className="ml-2">
                      {t('employees.badge.pharmacist')}
                    </Badge>
                  ) : null}
                </TableCell>
                <TableCell>{item.position_label ?? positionLabel(item.position)}</TableCell>
                <TableCell>{statusLabel(item.status)}</TableCell>
                <TableCell>{item.phone}</TableCell>
                <TableCell>
                  {item.user_id ? t('employees.list.linked') : t('employees.list.unlinked')}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <AddEmployeeDialog
        open={modalOpen}
        onOpenChange={setModalOpen}
        skipQuery={skipQuery}
        locationId={locationId}
      />
      {drawerId ? (
        <EmployeeDrawer
          open
          employeeId={drawerId}
          employee={selected}
          skipQuery={skipQuery}
          locationId={locationId}
          onOpenChange={(open) => {
            if (!open) {
              setDrawerId(undefined);
            }
          }}
        />
      ) : null}
    </section>
  );
}
