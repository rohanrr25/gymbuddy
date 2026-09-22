import type { Metadata } from "next";
import { getProfile } from "@/lib/profile";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Settings · GymBuddy" };

export default async function SettingsPage() {
  const profile = await getProfile();
  return <SettingsForm profile={profile!} />;
}
