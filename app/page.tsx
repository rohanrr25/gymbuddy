import { getActivePlan } from "@/lib/routines";
import { listExercises, listLastSetPerExercise, listRecentSets } from "@/lib/sets";
import { Logger } from "./logger";

export default async function Home() {
  const [exercises, recentSets, lastSets, plan] = await Promise.all([
    listExercises(),
    listRecentSets(),
    listLastSetPerExercise(),
    getActivePlan(),
  ]);

  return <Logger exercises={exercises} recentSets={recentSets} lastSets={lastSets} plan={plan} />;
}
