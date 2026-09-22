import type { Metadata } from "next";
import { listManualPRs, listPRs } from "@/lib/prs";
import { listExercises } from "@/lib/sets";
import { ProgressTabs } from "../tabs";
import { PRBoard } from "./pr-board";

export const metadata: Metadata = { title: "PRs · GymBuddy" };

export default async function PRsPage() {
  const [prs, manual, exercises] = await Promise.all([listPRs(), listManualPRs(), listExercises()]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pt-4 pb-28">
      <h1 className="font-display text-3xl font-bold">Progress</h1>
      <ProgressTabs current="prs" />
      <PRBoard prs={prs} manual={manual} exercises={exercises} />
    </main>
  );
}
