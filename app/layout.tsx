import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { ClerkProvider, UserButton } from "@clerk/nextjs";
import { Barlow, Barlow_Condensed, Geist_Mono } from "next/font/google";
import "./globals.css";

// Barlow: one family, drawn from highway signage. Utilitarian and very legible.
// The condensed cut is reserved for numbers.
const barlow = Barlow({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GymBuddy",
  description: "Track workouts, routines, and personal records.",
};

export const viewport: Viewport = {
  themeColor: "#f3f4f2",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${barlow.variable} ${barlowCondensed.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ClerkProvider>
          {/* Navigation lives in the bottom tab bar (app/(app)/tab-bar.tsx). */}
          <header className="mx-auto flex w-full max-w-md items-center justify-between px-4 pt-4">
            <Link href="/" translate="no" className="truncate font-display text-lg font-bold tracking-tight">
              GymBuddy
            </Link>
            <UserButton />
          </header>
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
