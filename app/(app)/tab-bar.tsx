"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Dumbbell, House, Settings, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

// Bottom tabs: thumb-reachable mid-workout. Five is the ceiling — when the Coach (AI) tab
// lands, something here has to give rather than becoming a sixth.
const TABS = [
  { href: "/", label: "Home", icon: House },
  { href: "/log", label: "Log", icon: Dumbbell },
  { href: "/routines", label: "Routines", icon: CalendarDays },
  { href: "/progress", label: "Progress", icon: TrendingUp },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="mx-auto flex w-full max-w-md">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-xs outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                  active ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon aria-hidden className={cn("size-6", active && "text-plate-blue")} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
