import "server-only";
import { auth } from "@clerk/nextjs/server";
import { canSignUp, isAdult, MIN_AGE } from "@/lib/age";
import { pool } from "@/lib/db";

// Profile and age rules. Same rule as the other data files: every function checks
// who's asking and only touches that user's row.

export type Profile = {
  displayName: string;
  dateOfBirth: string; // YYYY-MM-DD
  phone: string | null;
  weeklyTarget: number;
  adult: boolean; // social features stay off under 18
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;

async function requireUserId() {
  const { userId } = await auth();
  if (!userId) throw new Error("Not signed in");
  return userId;
}

export async function getProfile(): Promise<Profile | null> {
  const userId = await requireUserId();
  const { rows } = await pool.query(
    "select display_name, date_of_birth::text, phone, weekly_target from profiles where user_id = $1",
    [userId],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    displayName: row.display_name,
    dateOfBirth: row.date_of_birth,
    phone: row.phone,
    weeklyTarget: row.weekly_target,
    adult: isAdult(row.date_of_birth),
  };
}

export async function saveProfile(input: {
  displayName: string;
  dateOfBirth: string;
  phone?: string | null;
  weeklyTarget?: number;
}) {
  const userId = await requireUserId();
  const displayName = input.displayName.trim().replace(/\s+/g, " ");
  if (displayName.length < 1 || displayName.length > 40) throw new Error("Name must be 1–40 characters");
  if (!DATE.test(input.dateOfBirth) || Number.isNaN(Date.parse(input.dateOfBirth))) {
    throw new Error("Enter your date of birth");
  }
  if (!canSignUp(input.dateOfBirth)) throw new Error(`You need to be ${MIN_AGE} or older to use GymBuddy`);
  const phone = input.phone?.trim() || null;
  if (phone && (phone.length < 5 || phone.length > 20)) throw new Error("Enter a valid phone number, or leave it blank");
  const weeklyTarget = input.weeklyTarget ?? 3;
  if (!Number.isInteger(weeklyTarget) || weeklyTarget < 1 || weeklyTarget > 14) {
    throw new Error("Weekly target must be 1–14 workouts");
  }

  await pool.query(
    `insert into profiles (user_id, display_name, date_of_birth, phone, weekly_target)
     values ($1, $2, $3, $4, $5)
     on conflict (user_id) do update set display_name = excluded.display_name,
       date_of_birth = excluded.date_of_birth, phone = excluded.phone,
       weekly_target = excluded.weekly_target, updated_at = now()`,
    [userId, displayName, input.dateOfBirth, phone, weeklyTarget],
  );
}
