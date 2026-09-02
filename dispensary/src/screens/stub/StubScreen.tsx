export default function StubScreen({ title }: { title: string }) {
  return (
    <div className="border border-dashed border-line bg-surface px-6 py-10">
      <h1 className="font-serif text-xl font-semibold text-ink">{title}</h1>
      <p className="mt-2 max-w-md text-sm text-muted">
        Module shell for this counter. Open the next ready requirement story to build it.
      </p>
    </div>
  );
}
