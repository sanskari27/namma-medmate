import { t } from '../lib/copy.ts';

export function ManageUsersNavLink() {
  return (
    <a
      href="/account/users"
      className="inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-foreground hover:bg-muted"
    >
      {t('manageUsers.nav.title')}
    </a>
  );
}
