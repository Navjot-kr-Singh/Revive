import { describe, it, expect } from 'vitest';
import { SeededRandom } from '@/server/services/synthetic-data/seeded-random';
import { PaymentGenerator } from '@/server/services/synthetic-data/payment-generator';
import { CustomerGenerator } from '@/server/services/synthetic-data/customer-generator';
import { TransactionGenerator } from '@/server/services/synthetic-data/transaction-generator';
import { HERO_UPI_SCENARIO } from '@/server/services/synthetic-data/scenario-generator';

describe('Synthetic Data Generator & Determinism', () => {
  it('guarantees 100% deterministic reproducibility with same seed', () => {
    const seed = 20260826;
    const gen1 = new TransactionGenerator(seed);
    const gen2 = new TransactionGenerator(seed);

    const stream1 = gen1.generateStream({
      seed,
      totalTransactions: 100,
      merchantId: 'test_merchant_id',
    });

    const stream2 = gen2.generateStream({
      seed,
      totalTransactions: 100,
      merchantId: 'test_merchant_id',
    });

    expect(stream1.length).toBe(100);
    expect(stream2.length).toBe(100);

    for (let i = 0; i < 100; i++) {
      expect(stream1[i].orderId).toBe(stream2[i].orderId);
      expect(stream1[i].paymentProfile.amountMinor).toBe(stream2[i].paymentProfile.amountMinor);
      expect(stream1[i].paymentProfile.bank).toBe(stream2[i].paymentProfile.bank);
      expect(stream1[i].paymentProfile.paymentMethod).toBe(stream2[i].paymentProfile.paymentMethod);
      expect(stream1[i].status).toBe(stream2[i].status);
      expect(stream1[i].failureCode).toBe(stream2[i].failureCode);
    }
  });

  it('produces realistic Indian fintech payment methods & bank distributions', () => {
    const prng = new SeededRandom(42);
    const payGen = new PaymentGenerator(prng);

    const methodCounts: Record<string, number> = {};
    const bankCounts: Record<string, number> = {};

    for (let i = 0; i < 1000; i++) {
      const profile = payGen.generatePaymentProfile();
      methodCounts[profile.paymentMethod] = (methodCounts[profile.paymentMethod] || 0) + 1;
      bankCounts[profile.bank] = (bankCounts[profile.bank] || 0) + 1;
      expect(profile.amountMinor).toBeGreaterThan(0);
      expect(profile.currency).toBe('INR');
    }

    // Verify key Indian payment methods are represented
    expect(methodCounts['upi']).toBeGreaterThan(300); // UPI is largest (~45%)
    expect(methodCounts['card_debit']).toBeGreaterThan(150);
    expect(methodCounts['netbanking']).toBeGreaterThan(50);

    // Verify top Indian banks are represented
    expect(bankCounts['HDFC Bank']).toBeGreaterThan(150);
    expect(bankCounts['State Bank of India']).toBeGreaterThan(120);
    expect(bankCounts['ICICI Bank']).toBeGreaterThan(100);
  });

  it('injects systemic degradation scenario into stream accurately', () => {
    const gen = new TransactionGenerator(20260826);
    const startTime = new Date('2026-08-26T10:00:00Z');

    const stream = gen.generateStream({
      seed: 20260826,
      totalTransactions: 1000,
      startTime,
      timeSpanMinutes: 60,
      merchantId: 'test_merchant',
      scenario: HERO_UPI_SCENARIO,
    });

    // Check transactions matching scenario target (HDFC Bank + UPI during 10:15 - 11:00)
    const affectedWindowStart = new Date(startTime.getTime() + 15 * 60 * 1000).getTime();
    const affectedWindowEnd = new Date(startTime.getTime() + 60 * 60 * 1000).getTime();

    const scenarioTxs = stream.filter(
      (tx) =>
        tx.paymentProfile.bank === 'HDFC Bank' &&
        tx.paymentProfile.paymentMethod === 'upi' &&
        tx.timestamp.getTime() >= affectedWindowStart &&
        tx.timestamp.getTime() <= affectedWindowEnd
    );

    expect(scenarioTxs.length).toBeGreaterThan(20);

    const failedCount = scenarioTxs.filter((tx) => tx.status === 'failed').length;
    const failureRate = failedCount / scenarioTxs.length;

    // Failure rate should closely match scenario configured incident rate (26.6%)
    expect(failureRate).toBeGreaterThan(0.18);
    expect(failureRate).toBeLessThan(0.35);

    // Primary failure code should be BANK_TIMEOUT
    const bankTimeoutCount = scenarioTxs.filter((tx) => tx.failureCode === 'BANK_TIMEOUT').length;
    expect(bankTimeoutCount).toBe(failedCount);
  });
});
