export default function StubPage({ title }: { title: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
      <h2 className="text-xl font-semibold text-slate-700">{title}</h2>
      <p className="mt-2 text-sm text-slate-500">Module shell — select its next ready requirement story</p>
    </div>
  );
}
