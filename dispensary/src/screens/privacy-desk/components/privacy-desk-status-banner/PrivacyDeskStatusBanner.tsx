type Props = { text: string | null; tone?: 'alert' | 'ok' };

export function PrivacyDeskStatusBanner({ text, tone }: Props) {
  if (!text) return null;
  return (
    <p className="px-4 py-2 text-sm text-ink" data-tone={tone} role="status">
      {text}
    </p>
  );
}
