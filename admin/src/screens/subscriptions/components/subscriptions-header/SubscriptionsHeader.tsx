export function SubscriptionsHeader() {
  return (
    <div className="border-b border-line pb-4">
      <h1 className="font-serif text-xl text-ink">Plan overrides</h1>
      <p className="mt-1 text-sm text-muted">
        Scan the platform ledger: tenant plan, stall occupancy, expiry, and any branch-cap
        exception. File a MASTER override with a reason; the docket stays append-only. Pharmacy-to-platform
        charges sit below the ledger.
      </p>
    </div>
  );
}
