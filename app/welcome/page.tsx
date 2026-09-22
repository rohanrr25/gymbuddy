import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { getProfile } from "@/lib/profile";
import { WelcomeForm } from "./welcome-form";

export const metadata: Metadata = { title: "Welcome · GymBuddy" };

// First run: collect what Clerk doesn't have. Signed-in users with a profile skip it.
export default async function WelcomePage() {
  const [profile, user] = await Promise.all([getProfile(), currentUser()]);
  if (profile) redirect("/");

  const suggestedName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.username || "";
  return <WelcomeForm suggestedName={suggestedName} />;
}
