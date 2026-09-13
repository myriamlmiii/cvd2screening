export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="mb-8">
        <div className="h-8 w-72 rounded bg-surface-2" />
        <div className="mt-2 h-3 w-48 rounded bg-surface-2" />
      </div>
      <div className="mb-12 grid grid-cols-5 gap-px rounded-lg border border-line bg-line">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-surface p-4">
            <div className="h-2.5 w-20 rounded bg-surface-2" />
            <div className="mt-3 h-7 w-14 rounded bg-surface-2" />
          </div>
        ))}
      </div>
      <div className="h-64 rounded-lg border border-line bg-surface" />
    </div>
  );
}
