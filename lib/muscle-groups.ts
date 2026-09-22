// The muscle groups an exercise can belong to. Each has a plate colour in
// components/exercise-select.tsx. Shared by the server (validation) and the picker.
export const MUSCLE_GROUPS = ["Chest", "Back", "Legs", "Shoulders", "Arms", "Core"] as const;
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];
export const isMuscleGroup = (value: string): value is MuscleGroup =>
  (MUSCLE_GROUPS as readonly string[]).includes(value);
