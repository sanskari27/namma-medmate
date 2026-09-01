export default function StubPage({ title }: { title: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900 p-8 text-center">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-slate-400">Module shell — implement via /orchestrate-features</p>
    </div>
  );
}
