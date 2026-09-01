import { t } from '../lib/copy.ts';

export function GoLiveNavLink() {
  return (
    <a
      href="/account/go-live"
      className="inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-foreground hover:bg-muted"
    >
      {t('goLiveKyc.nav.title')}
    </a>
  );
}
