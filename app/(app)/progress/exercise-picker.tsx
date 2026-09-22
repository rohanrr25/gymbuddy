"use client";

import { useRouter } from "next/navigation";
import { ExerciseSelect } from "@/components/exercise-select";
import type { Exercise } from "@/lib/sets";

// The chosen exercise lives in the URL, so a chart can be bookmarked or shared.
export function ExercisePicker({ exercises, value }: { exercises: Exercise[]; value: string }) {
  const router = useRouter();
  return (
    <ExerciseSelect
      exercises={exercises}
      value={value}
      label="Exercise"
      onChange={(id) => router.push(`/progress?exercise=${id}`)}
    />
  );
}
