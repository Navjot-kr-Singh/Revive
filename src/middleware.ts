import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Proxy / Middleware
 * 
 * When Clerk is configured: delegates to clerkMiddleware for auth.
 * When Clerk is NOT configured (demo mode): passes all requests through.
 * This ensures development is never blocked by missing credentials.
 */

const isClerkConfigured = !!(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  process.env.CLERK_SECRET_KEY
);



export default async function middleware(request: NextRequest) {
  if (!isClerkConfigured) {
    // Demo mode: no auth enforcement
    return NextResponse.next();
  }

  // Clerk mode: delegate to clerkMiddleware
  try {
    const { clerkMiddleware, createRouteMatcher } = await import('@clerk/nextjs/server');
    const isPublic = createRouteMatcher([
      '/',
      '/sign-in(.*)',
      '/sign-up(.*)',
      '/api/webhooks(.*)',
      '/api/health(.*)',
      '/api/events',
    ]);

    const handler = clerkMiddleware(async (auth, req) => {
      if (!isPublic(req)) {
        await auth.protect();
      }
    });

    return (handler as (req: NextRequest) => Promise<NextResponse>)(request);
  } catch {
    // If Clerk fails, pass through
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
