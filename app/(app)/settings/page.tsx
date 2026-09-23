import type { Metadata } from "next";
import { getProfile } from "@/lib/profile";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Settings · GymBuddy" };

export default async function SettingsPage() {
  const profile = await getProfile();
  // Which build you're actually running: the answer to "is my phone showing stale code?"
  const version = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local";
  return <SettingsForm profile={profile!} version={version} />;
}
