type Props = { text: string | null };

export function PrincipalRequestsStatus({ text }: Props) {
  if (!text) return null;
  return (
    <p className="border-b border-line px-4 py-2 text-sm text-ink" role="status">
      {text}
    </p>
  );
}
