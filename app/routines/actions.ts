"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import {
  createRoutine,
  deleteRoutine,
  saveRoutine,
  setActiveRoutine,
  TEMPLATES,
  type Routine,
  type Template,
} from "@/lib/routines";

// Thin wrappers: auth, validation, and SQL all live in lib/routines.ts.

export async function createRoutineAction(template: Template) {
  if (!(template in TEMPLATES)) throw new Error("Unknown template");
  const id = await createRoutine(template);
  redirect(`/routines/${id}`);
}

export async function saveRoutineAction(routine: Routine) {
  await saveRoutine(routine);
  refresh();
}

export async function setActiveRoutineAction(id: string) {
  await setActiveRoutine(id);
  refresh();
}

export async function deleteRoutineAction(id: string) {
  await deleteRoutine(id);
  redirect("/routines");
}
