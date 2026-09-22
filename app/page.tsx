import { listExercises, listLastSetPerExercise, listRecentSets } from "@/lib/sets";
import { Logger } from "./logger";

export default async function Home() {
  const [exercises, recentSets, lastSets] = await Promise.all([
    listExercises(),
    listRecentSets(),
    listLastSetPerExercise(),
  ]);

  return <Logger exercises={exercises} recentSets={recentSets} lastSets={lastSets} />;
}
