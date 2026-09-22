import { getProfile } from "@/lib/profile";
import { getActivePlan } from "@/lib/routines";
import { listExercises, listRecentSetTimes } from "@/lib/sets";
import { Home } from "./home";

export default async function HomePage() {
  const [profile, plan, setTimes, exercises] = await Promise.all([
    getProfile(),
    getActivePlan(),
    listRecentSetTimes(),
    listExercises(),
  ]);

  return <Home profile={profile!} plan={plan} setTimes={setTimes} exercises={exercises} />;
}
