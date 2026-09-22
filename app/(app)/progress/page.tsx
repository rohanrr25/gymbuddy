import type { Metadata } from "next";
import Link from "next/link";
import { listExercises, listLoggedExerciseIds, listSetsForExercise } from "@/lib/sets";
import { ExercisePicker } from "./exercise-picker";
import { ProgressChart } from "./progress-chart";
import { ProgressTabs } from "./tabs";

export const metadata: Metadata = { title: "Progress · GymBuddy" };

export default async function ProgressPage(props: PageProps<"/progress">) {
  const { exercise } = await props.searchParams;
  const [exercises, loggedIds] = await Promise.all([listExercises(), listLoggedExerciseIds()]);

  // Only exercises you've logged; default to the one you trained most recently.
  const logged = loggedIds.map((id) => exercises.find((e) => e.id === id)).filter((e) => e !== undefined);
  const selected = logged.find((e) => e.id === exercise) ?? logged[0];
  const sets = selected ? await listSetsForExercise(selected.id) : [];

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pt-4 pb-28">
      <h1 className="font-display text-3xl font-bold">Progress</h1>
      <ProgressTabs current="charts" />
      {selected ? (
        <>
          <ExercisePicker exercises={logged} value={selected.id} />
          <ProgressChart key={selected.id} sets={sets} />
        </>
      ) : (
        <p className="text-muted-foreground">
          Nothing to chart yet.{" "}
          <Link href="/" className="font-medium text-foreground underline underline-offset-4">
            Log a set
          </Link>{" "}
          and your progress shows up here.
        </p>
      )}
    </main>
  );
}
