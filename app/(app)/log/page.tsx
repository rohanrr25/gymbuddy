import { listBodyweights } from "@/lib/bodyweight";
import { listPRs } from "@/lib/prs";
import { getActivePlan, listRecentWorkouts } from "@/lib/routines";
import { listExercises, listSetsSince } from "@/lib/sets";
import { Logger } from "./logger";

export default async function Home() {
  const [exercises, recentSets, plan, prs, bodyweights, workouts] = await Promise.all([
    listExercises(),
    listSetsSince(30), // today's sets, plus enough history to replay your last session
    getActivePlan(),
    listPRs(),
    listBodyweights(90), // the latest weighing, for the calorie estimate
    listRecentWorkouts(2), // when you last completed one — including freestyle, which the plan omits
  ]);

  return (
    <Logger
      exercises={exercises}
      recentSets={recentSets}
      plan={plan}
      prs={prs}
      bodyweight={bodyweights[0]?.weight ?? null}
      lastCompletedAt={workouts.at(-1)?.completedAt ?? null}
    />
  );
}
