import { redirect } from "next/navigation";
import { getProfile } from "@/lib/profile";
import { TabBar } from "./tab-bar";

// Everything inside (app) needs a profile: first run collects it at /welcome.
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const profile = await getProfile();
  if (!profile) redirect("/welcome");

  return (
    <>
      {children}
      <TabBar />
    </>
  );
}
