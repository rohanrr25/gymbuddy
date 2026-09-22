"use server";

import { refresh } from "next/cache";
import { deleteDay, listDaySets, setDayRoutineDay, type DaySet } from "@/lib/calendar";

// Thin wrappers: auth, validation and SQL live in lib/calendar.ts.
export async function daySetsAction(fromISO: string, toISO: string): Promise<DaySet[]> {
  return listDaySets(fromISO, toISO);
}

export async function setDayRoutineDayAction(fromISO: string, toISO: string, routineDayId: string | null) {
  await setDayRoutineDay(fromISO, toISO, routineDayId);
  refresh();
}

export async function deleteDayAction(fromISO: string, toISO: string) {
  await deleteDay(fromISO, toISO);
  refresh();
}
