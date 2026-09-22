"use server";

import { refresh } from "next/cache";
import { completeWorkout } from "@/lib/routines";
import { addExercise, deleteSet, logSet, type NewSet } from "@/lib/sets";

// Thin wrappers: auth, validation, and SQL all live in lib/.
export async function logSetAction(input: NewSet) {
  await logSet(input);
  refresh();
}

export async function deleteSetAction(id: string) {
  await deleteSet(id);
  refresh();
}

// Returns the new exercise's id so the picker can select it straight away.
export async function addExerciseAction(name: string, muscleGroup: string): Promise<string> {
  const id = await addExercise(name, muscleGroup);
  refresh();
  return id;
}

export async function completeWorkoutAction(dayId: string) {
  await completeWorkout(dayId);
  refresh();
}
