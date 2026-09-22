import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Barlow, Barlow_Condensed, Geist_Mono } from "next/font/google";
import { THEME_SCRIPT } from "@/lib/theme";
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
  appleWebApp: { capable: true, title: "GymBuddy", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f4f2" },
    { media: "(prefers-color-scheme: dark)", color: "#16181c" },
  ],
  // Fills the notch area when installed to the Home Screen.
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      // The theme script sets a class here before React hydrates.
      suppressHydrationWarning
      className={`${barlow.variable} ${barlowCondensed.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background pt-[env(safe-area-inset-top)] text-foreground">
        {/* Before paint, so opening the app in the dark doesn't flash white. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <ClerkProvider>
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
