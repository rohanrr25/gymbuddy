"use server";

import { refresh } from "next/cache";
import { addManualPR, deleteManualPR } from "@/lib/prs";

// Thin wrappers: auth, validation, and SQL all live in lib/prs.ts.
export async function addPRAction(input: { exerciseId: string; weight: number; reps: number; achievedOn: string }) {
  await addManualPR(input);
  refresh();
}

export async function deletePRAction(id: string) {
  await deleteManualPR(id);
  refresh();
}
