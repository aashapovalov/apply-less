export function JobsSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="bg-card animate-pulse rounded-xl p-6">
          <div className="bg-background h-6 w-2/3 rounded" />
          <div className="bg-background mt-2 h-4 w-1/3 rounded" />
          <div className="mt-4 flex gap-2">
            <div className="bg-background h-6 w-16 rounded" />
            <div className="bg-background h-6 w-20 rounded" />
            <div className="bg-background h-6 w-14 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
