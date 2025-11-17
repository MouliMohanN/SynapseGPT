export function DocumentTreeSkeleton() {
  return (
    <div className="space-y-2 p-3 animate-pulse">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="flex items-center gap-2" style={{ paddingLeft: `${(i % 3) * 10}px` }}>
          <div className="w-3 h-3 bg-slate-700 rounded"></div>
          <div className="h-3 bg-slate-700 rounded flex-1"></div>
        </div>
      ))}
    </div>
  );
}

export function DocumentViewerSkeleton() {
  return (
    <div className="space-y-3 p-3 animate-pulse">
      <div className="h-4 bg-slate-700 rounded w-3/4"></div>
      <div className="h-4 bg-slate-700 rounded w-full"></div>
      <div className="h-4 bg-slate-700 rounded w-5/6"></div>
      <div className="h-8 bg-slate-800 rounded my-4"></div>
      <div className="h-4 bg-slate-700 rounded w-full"></div>
      <div className="h-4 bg-slate-700 rounded w-4/5"></div>
      <div className="h-4 bg-slate-700 rounded w-full"></div>
      <div className="h-4 bg-slate-700 rounded w-3/4"></div>
    </div>
  );
}

export function SummarySkeleton() {
  return (
    <div className="space-y-2 p-3 animate-pulse">
      <div className="h-3 bg-slate-700 rounded w-full"></div>
      <div className="h-3 bg-slate-700 rounded w-5/6"></div>
      <div className="h-3 bg-slate-700 rounded w-4/5"></div>
      <div className="h-3 bg-slate-700 rounded w-full"></div>
      <div className="h-3 bg-slate-700 rounded w-3/4"></div>
    </div>
  );
}
