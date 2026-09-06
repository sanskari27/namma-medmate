import type { statusCopy } from '../../SubscriptionScreen.utils';

type Banner = NonNullable<ReturnType<typeof statusCopy>>;

export function PlanStatusBanner({
  statusId,
  banner,
}: {
  statusId: string;
  banner: Banner;
}) {
  return (
    <p
      id={statusId}
      role="alert"
      aria-live="polite"
      className="flex items-start gap-2 border border-line bg-brand-soft px-3 py-2 text-sm text-ink"
    >
      <banner.icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      {banner.text}
    </p>
  );
}
