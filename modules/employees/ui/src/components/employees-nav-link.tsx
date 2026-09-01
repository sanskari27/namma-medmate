import { t } from '../lib/copy.ts';

export function EmployeesNavLink() {
  return (
    <a
      href="/account/employees"
      className="inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-foreground hover:bg-muted"
    >
      {t('employees.nav.title')}
    </a>
  );
}
