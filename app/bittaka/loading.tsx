export default function BittakaLoading() {
  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8">
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <div className="h-9 w-24 animate-pulse rounded-full bg-surface-strong" />
        <div className="h-9 w-32 animate-pulse rounded-full bg-surface-strong" />
        <div className="h-9 w-20 animate-pulse rounded-full bg-surface-strong" />
      </div>
      <div className="flex flex-col gap-2">
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="flex items-center gap-3 rounded-lg border bg-surface-card px-4 py-3"
          >
            <div className="size-8 animate-pulse rounded-full bg-surface-strong" />
            <div className="size-4 animate-pulse rounded bg-surface-strong" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="h-4 w-3/5 animate-pulse rounded bg-surface-strong" />
              <div className="h-3 w-2/5 animate-pulse rounded bg-surface-strong" />
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="h-4 w-16 animate-pulse rounded bg-surface-strong" />
              <div className="h-3 w-12 animate-pulse rounded bg-surface-strong" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
