export default function StubScreen({ title }: { title: string }) {
  return (
    <div className="border border-dashed border-line bg-elevated px-6 py-10">
      <h1 className="font-serif text-xl font-semibold">{title}</h1>
      <p className="mt-2 max-w-md text-sm text-muted">
        Platform module shell. Open the next ready requirement story to build the HQ flow.
      </p>
    </div>
  );
}
