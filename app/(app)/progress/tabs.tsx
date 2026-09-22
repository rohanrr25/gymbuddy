import Link from "next/link";
import { cn } from "@/lib/utils";

// Links, not buttons: each tab has its own URL.
export function ProgressTabs({ current }: { current: "charts" | "prs" | "calendar" }) {
  const tabs = [
    { id: "charts", href: "/progress", label: "Charts" },
    { id: "prs", href: "/progress/prs", label: "PRs" },
    { id: "calendar", href: "/progress/calendar", label: "Calendar" },
  ] as const;
  return (
    <nav aria-label="Progress" className="grid grid-cols-3 gap-1 rounded-xl bg-secondary p-1">
      {tabs.map((t) => (
        <Link
          key={t.id}
          href={t.href}
          aria-current={current === t.id ? "page" : undefined}
          className={cn(
            "flex h-11 items-center justify-center rounded-lg text-[0.95rem] font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
            current === t.id ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
