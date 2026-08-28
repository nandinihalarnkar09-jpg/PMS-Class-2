import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
  "/api/health",
]);

const clerk = clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export default function middleware(req: NextRequest, event: NextFetchEvent) {
  const path = req.nextUrl.pathname;

  // Clerk's handshake query is too large for the Cursor preview proxy.
  if (req.nextUrl.searchParams.has("__clerk_handshake")) {
    return NextResponse.redirect(new URL("http://localhost:3000/sign-in"));
  }

  if (path === "/" || path === "/api/health") {
    return NextResponse.next();
  }
  return clerk(req, event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
