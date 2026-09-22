import { clerkMiddleware } from "@clerk/nextjs/server";

// Every page and API route requires sign-in. Signed-out visitors are sent to
// Clerk's hosted sign-in page, so the app has no public routes of its own.
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
