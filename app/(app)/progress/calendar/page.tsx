import type { Metadata } from "next";
import { getActivePlan, listRecentWorkouts } from "@/lib/routines";
import { listRecentSetTimes } from "@/lib/sets";
import { ProgressTabs } from "../tabs";
import { WorkoutCalendar } from "./calendar";

export const metadata: Metadata = { title: "Calendar · GymBuddy" };

const YEAR = 365;

export default async function CalendarPage() {
  const [workouts, setTimes, plan] = await Promise.all([
    listRecentWorkouts(YEAR),
    listRecentSetTimes(YEAR),
    getActivePlan(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pt-4 pb-28">
      <h1 className="font-display text-3xl font-bold">Progress</h1>
      <ProgressTabs current="calendar" />
      <WorkoutCalendar workouts={workouts} setTimes={setTimes} days={plan?.routine.days ?? []} />
    </main>
  );
}
