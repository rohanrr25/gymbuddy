import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getRoutine } from "@/lib/routines";
import { listExercises } from "@/lib/sets";
import { RoutineEditor } from "./editor";

export const metadata: Metadata = { title: "Edit routine · GymBuddy" };

export default async function RoutinePage(props: PageProps<"/routines/[id]">) {
  const { id } = await props.params;
  const [routine, exercises] = await Promise.all([getRoutine(id), listExercises()]);
  if (!routine) notFound();

  return <RoutineEditor routine={routine} exercises={exercises} />;
}
