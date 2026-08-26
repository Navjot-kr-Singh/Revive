/**
 * REVIVE — Merchant Service
 * 
 * Handles merchant context resolution and tenant isolation.
 * Every business query must go through this service to ensure merchant_id enforcement.
 */

import { getDb } from '@/server/db';
import { merchants, merchantMembers, users } from '@/server/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Get the merchant for a Clerk user.
 * Returns the first merchant the user is a member of.
 * 
 * This enforces tenant isolation: a user can only access merchants they belong to.
 */
export async function getMerchantForUser(clerkUserId: string) {
  const db = getDb();

  const result = await db.select({
    merchantId: merchants.id,
    merchantName: merchants.name,
    merchantSlug: merchants.slug,
    merchantCategory: merchants.category,
    userId: users.id,
    role: merchantMembers.role,
  })
    .from(users)
    .innerJoin(merchantMembers, eq(merchantMembers.userId, users.id))
    .innerJoin(merchants, eq(merchants.id, merchantMembers.merchantId))
    .where(eq(users.clerkUserId, clerkUserId))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  return result[0];
}

/**
 * Verify that a user has access to a specific merchant.
 * Returns false if the user is not a member of the merchant.
 */
export async function verifyMerchantAccess(clerkUserId: string, merchantId: string): Promise<boolean> {
  const db = getDb();

  const result = await db.select({ id: merchantMembers.id })
    .from(users)
    .innerJoin(merchantMembers, eq(merchantMembers.userId, users.id))
    .where(
      and(
        eq(users.clerkUserId, clerkUserId),
        eq(merchantMembers.merchantId, merchantId),
      )
    )
    .limit(1);

  return result.length > 0;
}

/**
 * Ensure a Clerk user exists in our database.
 * Creates the user record if it doesn't exist (first sign-in sync).
 */
export async function ensureUser(clerkUserId: string, email: string, displayName?: string) {
  const db = getDb();

  // Check if user already exists
  const existing = await db.select()
    .from(users)
    .where(eq(users.clerkUserId, clerkUserId))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  // Create user
  const result = await db.insert(users).values({
    clerkUserId,
    email,
    displayName,
  }).returning();

  return result[0];
}

/**
 * Get merchant by ID. Does NOT enforce tenant isolation — caller must verify access.
 */
export async function getMerchantById(merchantId: string) {
  const db = getDb();

  const result = await db.select()
    .from(merchants)
    .where(eq(merchants.id, merchantId))
    .limit(1);

  return result[0] ?? null;
}
