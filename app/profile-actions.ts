"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { saveProfile } from "@/lib/profile";

// Thin wrappers: auth, validation and SQL live in lib/profile.ts.
export async function completeSignUpAction(input: {
  displayName: string;
  dateOfBirth: string;
  phone?: string | null;
  weeklyTarget?: number;
}) {
  await saveProfile(input);
  redirect("/");
}

export async function saveProfileAction(input: {
  displayName: string;
  dateOfBirth: string;
  phone?: string | null;
  weeklyTarget?: number;
}) {
  await saveProfile(input);
  refresh();
}
