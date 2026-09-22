export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
        GymBuddy
      </h1>
      <p className="max-w-md text-balance text-muted-foreground">
        Track workouts, routines, and personal records.
      </p>
      <span className="mt-2 rounded-full border px-3 py-1 text-xs text-muted-foreground">
        Deployed and running
      </span>
    </main>
  );
}
