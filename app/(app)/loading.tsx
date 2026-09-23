// Every screen here is dynamic (your data, behind auth). Without a loading file Next skips
// prefetching them entirely and a tap sits on the old page until the server answers — which on
// Neon's free plan includes waking the database. This gives the tab an instant shape to land on.
function Bar({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-muted ${className}`} />;
}

export default function Loading() {
  return (
    <main aria-busy="true" aria-label="Loading" className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pt-4 pb-28">
      <Bar className="h-9 w-40" />
      <Bar className="h-28 w-full" />
      <div className="flex flex-col gap-3">
        <Bar className="h-12 w-full" />
        <Bar className="h-12 w-full" />
        <Bar className="h-12 w-3/4" />
      </div>
    </main>
  );
}
