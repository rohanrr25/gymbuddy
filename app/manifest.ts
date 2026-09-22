import type { MetadataRoute } from "next";

// Add to Home Screen: an icon and a full-screen app, with no browser chrome.
// Deliberately no push plumbing yet — a native app would replace that part (TRACKER → Direction).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GymBuddy",
    short_name: "GymBuddy",
    description: "Track workouts, routines and personal records.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f3f4f2", // chalk, matching the app
    theme_color: "#f3f4f2",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
