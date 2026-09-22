import { getProfile } from "@/lib/profile";
import { getActivePlan, listRecentWorkoutTimes } from "@/lib/routines";
import { listExercises, listRecentSetTimes } from "@/lib/sets";
import { Home } from "./home";

export default async function HomePage() {
  const [profile, plan, workoutTimes, setTimes, exercises] = await Promise.all([
    getProfile(),
    getActivePlan(),
    listRecentWorkoutTimes(), // streaks count completed workouts
    listRecentSetTimes(7), // just enough to spot an unfinished session today
    listExercises(),
  ]);

  return (
    <Home profile={profile!} plan={plan} workoutTimes={workoutTimes} setTimes={setTimes} exercises={exercises} />
  );
}
