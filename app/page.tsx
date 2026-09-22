import { listPRs } from "@/lib/prs";
import { getActivePlan } from "@/lib/routines";
import { listExercises, listLastSetPerExercise, listRecentSets } from "@/lib/sets";
import { Logger } from "./logger";

export default async function Home() {
  const [exercises, recentSets, lastSets, plan, prs] = await Promise.all([
    listExercises(),
    listRecentSets(),
    listLastSetPerExercise(),
    getActivePlan(),
    listPRs(),
  ]);

  return <Logger exercises={exercises} recentSets={recentSets} lastSets={lastSets} plan={plan} prs={prs} />;
}
