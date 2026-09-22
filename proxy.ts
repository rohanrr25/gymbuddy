import { clerkMiddleware } from "@clerk/nextjs/server";

// Every page and API route requires sign-in. The app icons and the manifest stay public —
// a phone fetches them when you add the app to your Home Screen — and the matcher below
// already skips .png and .webmanifest, so no exception is needed here.
// This is only the front door: data functions must still check auth() themselves.
export default clerkMiddleware(async (auth) => {
  await auth.protect();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
