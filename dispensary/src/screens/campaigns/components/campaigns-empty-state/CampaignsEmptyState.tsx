export function CampaignsEmptyState() {
  return (
    <section className="border border-line bg-surface p-3" aria-label="Empty broadcasts">
      <h2 className="text-sm font-semibold text-ink">Start a list</h2>
      <p className="mt-2 text-sm text-muted">
        New broadcast, pick a saved tag, then count this list. Ready to send freezes the count for
        later delivery.
      </p>
    </section>
  );
}
