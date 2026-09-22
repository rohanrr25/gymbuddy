"use server";

import { refresh } from "next/cache";
import { completeWorkout } from "@/lib/routines";
import { deleteSet, logSet, type NewSet } from "@/lib/sets";

// Thin wrappers: auth, validation, and SQL all live in lib/.
export async function logSetAction(input: NewSet) {
  await logSet(input);
  refresh();
}

export async function deleteSetAction(id: string) {
  await deleteSet(id);
  refresh();
}

export async function completeWorkoutAction(dayId: string) {
  await completeWorkout(dayId);
  refresh();
}
