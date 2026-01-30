export function JobSkeleton() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="bg-card animate-pulse rounded-xl p-8">
        <div className="bg-background h-8 w-2/3 rounded" />
        <div className="bg-background mt-4 h-4 w-1/3 rounded" />
        <div className="bg-background mt-8 h-40 rounded" />
      </div>
    </div>
  );
}
