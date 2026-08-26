/**
 * REVIVE — Auth Adapter
 * 
 * Provides a uniform auth interface that works with or without Clerk.
 * When DEMO_MODE=true or Clerk keys are missing, uses a deterministic
 * demo user so development is never blocked by external credentials.
 */

const DEMO_USER = {
  userId: 'demo_user_001',
  email: 'demo@revive.dev',
  displayName: 'Demo Operator',
};

/**
 * Check whether Clerk is configured and available.
 */
export function isClerkConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    process.env.CLERK_SECRET_KEY
  );
}

/**
 * Check whether we're in demo/development mode (no Clerk).
 */
export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === 'true' || !isClerkConfigured();
}

/**
 * Get the current user from either Clerk or the demo fallback.
 * Returns { userId, email, displayName } or null if unauthenticated.
 */
export async function getCurrentUser(): Promise<{
  userId: string;
  email: string;
  displayName: string;
} | null> {
  if (isDemoMode()) {
    return DEMO_USER;
  }

  try {
    const { auth } = await import('@clerk/nextjs/server');
    const { userId } = await auth();
    if (!userId) return null;

    return {
      userId,
      email: '', // Clerk provides via session claims, not needed for auth check
      displayName: '',
    };
  } catch {
    // Clerk unavailable — fall back to demo
    return DEMO_USER;
  }
}

export { DEMO_USER };
