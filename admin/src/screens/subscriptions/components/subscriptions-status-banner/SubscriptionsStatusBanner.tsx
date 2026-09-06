import type { statusCopy } from '../../SubscriptionsScreen.utils';

type Banner = NonNullable<ReturnType<typeof statusCopy>>;

export function SubscriptionsStatusBanner({
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
      className="flex items-start gap-2 border border-line bg-elevated px-3 py-2 text-sm text-ink"
    >
      <banner.icon className="mt-0.5 size-3.5 shrink-0 text-brand" aria-hidden="true" />
      <span>{banner.text}</span>
    </p>
  );
}
