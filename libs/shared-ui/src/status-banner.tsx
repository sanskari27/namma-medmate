export interface StatusBannerProps {
  tone: 'info' | 'error' | 'success';
  children: string;
}

export function StatusBanner({ tone, children }: StatusBannerProps) {
  const role = tone === 'error' ? 'alert' : 'status';
  return (
    <p
      role={role}
      data-tone={tone}
      className="rounded-md border border-border bg-surface-raised px-4 py-3 text-base text-ink"
    >
      {children}
    </p>
  );
}
