import { describe, it, expect, beforeAll } from 'vitest';
import { getCases, getCaseById, getRevenueSummary } from '@/server/services/case-service';
import { getMerchantForUser, verifyMerchantAccess } from '@/server/services/merchant-service';
import { getDb } from '@/server/db';
import { merchants, revenueCases, users, merchantMembers } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import { runSeed } from '@/server/db/seed';

describe('Tenant Isolation Verification', () => {
  let acmeMerchantId: string;
  let globexMerchantId: string;
  let acmeCaseId: string;
  let globexCaseId: string;

  beforeAll(async () => {
    // Re-seed DB to have a clean, known multi-tenant state
    await runSeed();
    const db = getDb();

    // Retrieve the two merchants
    const allMerchants = await db.select().from(merchants);
    const acme = allMerchants.find((m) => m.slug === 'acme-electronics')!;
    const globex = allMerchants.find((m) => m.slug === 'globex-retail')!;

    acmeMerchantId = acme.id;
    globexMerchantId = globex.id;

    // Retrieve cases for each merchant
    const acmeCases = await db.select().from(revenueCases).where(eq(revenueCases.merchantId, acmeMerchantId));
    const globexCases = await db.select().from(revenueCases).where(eq(revenueCases.merchantId, globexMerchantId));

    acmeCaseId = acmeCases[0].id;
    globexCaseId = globexCases[0].id;
  });

  it('Merchant A query never returns Merchant B cases', async () => {
    const acmeResult = await getCases(acmeMerchantId);
    expect(acmeResult.cases.length).toBeGreaterThan(0);

    // Assert ALL returned cases strictly belong to Acme
    for (const c of acmeResult.cases) {
      expect(c.merchantId).toBe(acmeMerchantId);
      expect(c.merchantId).not.toBe(globexMerchantId);
    }
  });

  it('Merchant B query never returns Merchant A cases', async () => {
    const globexResult = await getCases(globexMerchantId);
    expect(globexResult.cases.length).toBeGreaterThan(0);

    // Assert ALL returned cases strictly belong to Globex
    for (const c of globexResult.cases) {
      expect(c.merchantId).toBe(globexMerchantId);
      expect(c.merchantId).not.toBe(acmeMerchantId);
    }
  });

  it('Merchant A cannot fetch a specific case belonging to Merchant B', async () => {
    // Attempting to fetch Globex case using Acme merchantId context
    const unauthorizedAccess = await getCaseById(acmeMerchantId, globexCaseId);
    expect(unauthorizedAccess).toBeNull();
  });

  it('Merchant B cannot fetch a specific case belonging to Merchant A', async () => {
    // Attempting to fetch Acme case using Globex merchantId context
    const unauthorizedAccess = await getCaseById(globexMerchantId, acmeCaseId);
    expect(unauthorizedAccess).toBeNull();
  });

  it('Revenue summary metrics are strictly isolated per tenant', async () => {
    const acmeSummary = await getRevenueSummary(acmeMerchantId);
    const globexSummary = await getRevenueSummary(globexMerchantId);

    expect(acmeSummary.totalCases).toBe(3);
    expect(globexSummary.totalCases).toBe(1);

    // Acme revenue summary should not leak Globex revenue
    expect(acmeSummary.totalAtRiskMinor).toBeGreaterThan(globexSummary.totalAtRiskMinor);
  });

  it('verifyMerchantAccess blocks unauthorized cross-tenant operations', async () => {
    // Demo user belongs only to Acme
    const isAcmeAuthorized = await verifyMerchantAccess('demo_user_001', acmeMerchantId);
    expect(isAcmeAuthorized).toBe(true);

    const isGlobexAuthorized = await verifyMerchantAccess('demo_user_001', globexMerchantId);
    expect(isGlobexAuthorized).toBe(false);

    // Globex user belongs only to Globex
    const isOtherGlobexAuthorized = await verifyMerchantAccess('other_user_002', globexMerchantId);
    expect(isOtherGlobexAuthorized).toBe(true);

    const isOtherAcmeAuthorized = await verifyMerchantAccess('other_user_002', acmeMerchantId);
    expect(isOtherAcmeAuthorized).toBe(false);
  });

  it('getMerchantForUser resolves only the user authorized merchant', async () => {
    const userMerchant = await getMerchantForUser('demo_user_001');
    expect(userMerchant).not.toBeNull();
    expect(userMerchant?.merchantId).toBe(acmeMerchantId);
    expect(userMerchant?.merchantSlug).toBe('acme-electronics');
  });
});
