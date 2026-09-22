import { getProfile } from "@/lib/profile";
import { getActivePlan, listRecentWorkouts } from "@/lib/routines";
import { listExercises, listRecentSetTimes } from "@/lib/sets";
import { Home } from "./home";

export default async function HomePage() {
  const [profile, plan, workouts, setTimes, exercises] = await Promise.all([
    getProfile(),
    getActivePlan(),
    listRecentWorkouts(), // streaks count completed workouts
    listRecentSetTimes(7), // just enough to spot an unfinished session today
    listExercises(),
  ]);

  return (
    <Home profile={profile!} plan={plan} workoutTimes={workouts.map((w) => w.completedAt)} setTimes={setTimes} exercises={exercises} />
  );
}
