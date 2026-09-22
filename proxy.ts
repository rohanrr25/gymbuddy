import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// The app icons are the only public routes: a phone fetches them when you add the app to
// your Home Screen, and an icon isn't private. (The manifest is already public: the matcher
// below skips .webmanifest.) Everything else requires sign-in.
const isPublic = createRouteMatcher(["/icon", "/apple-icon"]);

// This is only the front door: data functions must still check auth() themselves.
export default clerkMiddleware(async (auth, req) => {
  if (!isPublic(req)) await auth.protect();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
