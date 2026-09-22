"use server";

import { refresh } from "next/cache";
import { deleteSet, logSet, type NewSet } from "@/lib/sets";

// Thin wrappers: auth, validation, and SQL all live in lib/sets.ts.
export async function logSetAction(input: NewSet) {
  await logSet(input);
  refresh();
}

export async function deleteSetAction(id: string) {
  await deleteSet(id);
  refresh();
}
