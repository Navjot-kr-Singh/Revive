/**
 * REVIVE — Database Seed Script
 * 
 * Seeds deterministic demo data for development, testing, and presentation.
 * Creates merchants (Acme Electronics, Globex Retail), demo user, default policies,
 * customers, orders, payments, payment events, and revenue cases.
 */

import { getDb } from './index';
import {
  merchants,
  users,
  merchantMembers,
  policies,
  customers,
  orders,
  payments,
  paymentEvents,
  revenueCases,
  auditEvents,
  incidentSignals,
  incidents,
} from './schema';
import { DEFAULT_POLICY, EVENT_TYPES, CASE_TYPES, CASE_PRIORITY } from '../../lib/constants';
import { toMinorUnits } from '../../lib/money';
import { createHash } from 'crypto';

export async function runSeed() {
  const db = getDb();
  console.log('🌱 Starting REVIVE database seed...');

  // ─── 1. Clean existing demo data in correct FK order ───────────
  await db.delete(auditEvents);
  await db.delete(incidentSignals);
  await db.delete(revenueCases);
  await db.delete(incidents);
  await db.delete(paymentEvents);
  await db.delete(payments);
  await db.delete(orders);
  await db.delete(customers);
  await db.delete(policies);
  await db.delete(merchantMembers);
  await db.delete(users);
  await db.delete(merchants);

  console.log('🧹 Cleaned previous seed data.');

  // ─── 2. Create Merchants ────────────────────────────────────────
  const [acme] = await db.insert(merchants).values({
    name: 'Acme Electronics',
    slug: 'acme-electronics',
    category: 'electronics',
    settings: {
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      autoRecoveryEnabled: true,
    },
  }).returning();

  const [globex] = await db.insert(merchants).values({
    name: 'Globex Retail',
    slug: 'globex-retail',
    category: 'retail',
    settings: {
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      autoRecoveryEnabled: false,
    },
  }).returning();

  console.log(`🏢 Created merchants: ${acme.name} (${acme.id}) & ${globex.name} (${globex.id})`);

  // ─── 3. Create Demo User ────────────────────────────────────────
  const [demoUser] = await db.insert(users).values({
    clerkUserId: 'demo_user_001',
    email: 'demo@revive.dev',
    displayName: 'Demo Operator',
  }).returning();

  const [otherUser] = await db.insert(users).values({
    clerkUserId: 'other_user_002',
    email: 'operator@globex.dev',
    displayName: 'Globex Operator',
  }).returning();

  console.log(`👤 Created demo users: ${demoUser.email} & ${otherUser.email}`);

  // ─── 4. Link Users to Merchants ─────────────────────────────────
  await db.insert(merchantMembers).values([
    {
      merchantId: acme.id,
      userId: demoUser.id,
      role: 'admin',
    },
    {
      merchantId: globex.id,
      userId: otherUser.id,
      role: 'admin',
    },
  ]);

  // ─── 5. Create Default Policies ─────────────────────────────────
  await db.insert(policies).values([
    {
      merchantId: acme.id,
      policyVersion: 'v1.0.0',
      rules: [
        { id: 'R1_MAX_RETRY', name: 'Max Retry Limit', max: 2 },
        { id: 'R2_MAX_CONTACT', name: 'Max Customer Contacts', max: 2 },
        { id: 'R3_HIGH_VALUE', name: 'High Value Threshold Minor', threshold: DEFAULT_POLICY.HIGH_VALUE_THRESHOLD_MINOR },
      ],
      maxRetryAttempts: DEFAULT_POLICY.MAX_RETRY_ATTEMPTS,
      maxCustomerContacts: DEFAULT_POLICY.MAX_CUSTOMER_CONTACTS,
      maxDiscountPercent: DEFAULT_POLICY.MAX_DISCOUNT_PERCENT,
      maxAutomatedRecoveryMinor: DEFAULT_POLICY.MAX_AUTOMATED_RECOVERY_MINOR,
      highValueThresholdMinor: DEFAULT_POLICY.HIGH_VALUE_THRESHOLD_MINOR,
      minRecoveryProbability: DEFAULT_POLICY.MIN_RECOVERY_PROBABILITY,
      minConfidence: DEFAULT_POLICY.MIN_CONFIDENCE,
      allowedActions: ['no_action', 'retry_payment', 'send_payment_link', 'alternative_payment_method', 'customer_notification', 'human_escalation'],
      isActive: true,
    },
    {
      merchantId: globex.id,
      policyVersion: 'v1.0.0',
      rules: [
        { id: 'R1_MAX_RETRY', name: 'Max Retry Limit', max: 1 },
      ],
      maxRetryAttempts: 1,
      maxCustomerContacts: 1,
      maxDiscountPercent: 0,
      maxAutomatedRecoveryMinor: 5_000_000,
      highValueThresholdMinor: 2_000_000,
      minRecoveryProbability: 0.2,
      minConfidence: 0.5,
      allowedActions: ['no_action', 'retry_payment'],
      isActive: true,
    },
  ]);

  console.log('🛡️ Configured merchant policies.');

  // ─── 6. Create Customers ────────────────────────────────────────
  const [custA1] = await db.insert(customers).values({
    merchantId: acme.id,
    externalId: 'ext_cust_101',
    emailHash: createHash('sha256').update('vip.buyer@example.com').digest('hex'),
    displayId: 'CUST-1001',
    segment: 'VIP',
    totalOrders: 45,
    totalSuccessPayments: 44,
    totalFailedPayments: 1,
    lifetimeValueMinor: toMinorUnits(185000, 'INR'),
    currency: 'INR',
  }).returning();

  const [custA2] = await db.insert(customers).values({
    merchantId: acme.id,
    externalId: 'ext_cust_102',
    emailHash: createHash('sha256').update('repeat.shopper@example.com').digest('hex'),
    displayId: 'CUST-1002',
    segment: 'Repeat',
    totalOrders: 6,
    totalSuccessPayments: 5,
    totalFailedPayments: 1,
    lifetimeValueMinor: toMinorUnits(28500, 'INR'),
    currency: 'INR',
  }).returning();

  await db.insert(customers).values({
    merchantId: acme.id,
    externalId: 'ext_cust_103',
    emailHash: createHash('sha256').update('new.user@example.com').digest('hex'),
    displayId: 'CUST-1003',
    segment: 'New',
    totalOrders: 1,
    totalSuccessPayments: 0,
    totalFailedPayments: 1,
    lifetimeValueMinor: toMinorUnits(0, 'INR'),
    currency: 'INR',
  });

  // Globex customer for isolation verification
  const [custG1] = await db.insert(customers).values({
    merchantId: globex.id,
    externalId: 'ext_cust_g1',
    emailHash: createHash('sha256').update('globex.user@example.com').digest('hex'),
    displayId: 'GLOBEX-001',
    segment: 'Standard',
    totalOrders: 2,
    totalSuccessPayments: 2,
    totalFailedPayments: 0,
    lifetimeValueMinor: toMinorUnits(12000, 'INR'),
    currency: 'INR',
  }).returning();

  console.log('👥 Created customers.');

  // ─── 7. Create Orders & Payments ────────────────────────────────
  // Order 1: High Value VIP (₹75,000)
  const [order1] = await db.insert(orders).values({
    merchantId: acme.id,
    customerId: custA1.id,
    externalOrderId: 'ORD-2026-001',
    amountMinor: toMinorUnits(75000, 'INR'),
    currency: 'INR',
    status: 'payment_failed',
    paymentMethod: 'upi',
  }).returning();

  const [payment1] = await db.insert(payments).values({
    merchantId: acme.id,
    orderId: order1.id,
    customerId: custA1.id,
    externalPaymentId: 'pay_rzp_fail_001',
    amountMinor: toMinorUnits(75000, 'INR'),
    currency: 'INR',
    status: 'failed',
    paymentMethod: 'upi',
    bank: 'HDFC Bank',
    failureReason: 'Bank timeout during UPI transfer',
    failureCode: 'BANK_TIMEOUT',
    attemptCount: 1,
    failedAt: new Date(),
  }).returning();

  // Order 2: Standard Repeat (₹2,499)
  const [order2] = await db.insert(orders).values({
    merchantId: acme.id,
    customerId: custA2.id,
    externalOrderId: 'ORD-2026-002',
    amountMinor: toMinorUnits(2499, 'INR'),
    currency: 'INR',
    status: 'payment_failed',
    paymentMethod: 'card_debit',
  }).returning();

  const [payment2] = await db.insert(payments).values({
    merchantId: acme.id,
    orderId: order2.id,
    customerId: custA2.id,
    externalPaymentId: 'pay_rzp_fail_002',
    amountMinor: toMinorUnits(2499, 'INR'),
    currency: 'INR',
    status: 'failed',
    paymentMethod: 'card_debit',
    bank: 'ICICI Bank',
    failureReason: 'Insufficient balance in account',
    failureCode: 'INSUFFICIENT_FUNDS',
    attemptCount: 1,
    failedAt: new Date(),
  }).returning();

  // Order 3: Recovered Order (₹14,999)
  const [order3] = await db.insert(orders).values({
    merchantId: acme.id,
    customerId: custA2.id,
    externalOrderId: 'ORD-2026-003',
    amountMinor: toMinorUnits(14999, 'INR'),
    currency: 'INR',
    status: 'completed',
    paymentMethod: 'upi',
  }).returning();

  const [payment3] = await db.insert(payments).values({
    merchantId: acme.id,
    orderId: order3.id,
    customerId: custA2.id,
    externalPaymentId: 'pay_rzp_succ_003',
    amountMinor: toMinorUnits(14999, 'INR'),
    currency: 'INR',
    status: 'captured',
    paymentMethod: 'upi',
    bank: 'State Bank of India',
    attemptCount: 2,
    authorizedAt: new Date(),
    capturedAt: new Date(),
  }).returning();

  // Globex Order (₹5,000) for tenant isolation verification
  const [orderG] = await db.insert(orders).values({
    merchantId: globex.id,
    customerId: custG1.id,
    externalOrderId: 'ORD-GLB-001',
    amountMinor: toMinorUnits(5000, 'INR'),
    currency: 'INR',
    status: 'payment_failed',
    paymentMethod: 'netbanking',
  }).returning();

  const [paymentG] = await db.insert(payments).values({
    merchantId: globex.id,
    orderId: orderG.id,
    customerId: custG1.id,
    externalPaymentId: 'pay_rzp_fail_glb',
    amountMinor: toMinorUnits(5000, 'INR'),
    currency: 'INR',
    status: 'failed',
    paymentMethod: 'netbanking',
    bank: 'Axis Bank',
    failureReason: 'Network error during transaction',
    failureCode: 'NETWORK_ERROR',
    attemptCount: 1,
    failedAt: new Date(),
  }).returning();

  console.log('💳 Created orders and payment records.');

  // ─── 8. Create Payment Events ───────────────────────────────────
  const event1Payload = {
    payment_id: payment1.id,
    order_id: order1.id,
    customer_id: custA1.id,
    amount_minor: payment1.amountMinor,
    currency: payment1.currency,
    failure_reason: payment1.failureReason,
    failure_code: payment1.failureCode,
    payment_method: payment1.paymentMethod,
    bank: payment1.bank,
  };

  const event2Payload = {
    payment_id: payment2.id,
    order_id: order2.id,
    customer_id: custA2.id,
    amount_minor: payment2.amountMinor,
    currency: payment2.currency,
    failure_reason: payment2.failureReason,
    failure_code: payment2.failureCode,
    payment_method: payment2.paymentMethod,
    bank: payment2.bank,
  };

  await db.insert(paymentEvents).values([
    {
      merchantId: acme.id,
      paymentId: payment1.id,
      eventType: EVENT_TYPES.PAYMENT_FAILED,
      eventId: 'evt_rzp_001',
      source: 'razorpay',
      sourceEventId: 'rzp_evt_src_001',
      payload: event1Payload,
      payloadHash: createHash('sha256').update(JSON.stringify(event1Payload)).digest('hex'),
      processingStatus: 'processed',
      processedAt: new Date(),
    },
    {
      merchantId: acme.id,
      paymentId: payment2.id,
      eventType: EVENT_TYPES.PAYMENT_FAILED,
      eventId: 'evt_rzp_002',
      source: 'razorpay',
      sourceEventId: 'rzp_evt_src_002',
      payload: event2Payload,
      payloadHash: createHash('sha256').update(JSON.stringify(event2Payload)).digest('hex'),
      processingStatus: 'processed',
      processedAt: new Date(),
    },
  ]);

  // ─── 9. Create Revenue Cases ────────────────────────────────────
  // Case 1: High Value Critical Case (New)
  const [case1] = await db.insert(revenueCases).values({
    merchantId: acme.id,
    paymentId: payment1.id,
    customerId: custA1.id,
    orderId: order1.id,
    caseType: CASE_TYPES.PAYMENT_FAILURE,
    status: 'new',
    priority: CASE_PRIORITY.CRITICAL,
    amountAtRiskMinor: payment1.amountMinor,
    currency: 'INR',
    failureReason: payment1.failureReason,
    failureCode: payment1.failureCode,
    expectedRecoveryMinor: toMinorUnits(56250, 'INR'),
    recoveryProbability: 0.75,
  }).returning();

  // Case 2: Standard Repeat Customer Case (Analyzing)
  const [case2] = await db.insert(revenueCases).values({
    merchantId: acme.id,
    paymentId: payment2.id,
    customerId: custA2.id,
    orderId: order2.id,
    caseType: CASE_TYPES.PAYMENT_FAILURE,
    status: 'analyzing',
    priority: CASE_PRIORITY.MEDIUM,
    amountAtRiskMinor: payment2.amountMinor,
    currency: 'INR',
    failureReason: payment2.failureReason,
    failureCode: payment2.failureCode,
    expectedRecoveryMinor: toMinorUnits(1249, 'INR'),
    recoveryProbability: 0.50,
  }).returning();

  // Case 3: Already Recovered Case
  const [case3] = await db.insert(revenueCases).values({
    merchantId: acme.id,
    paymentId: payment3.id,
    customerId: custA2.id,
    orderId: order3.id,
    caseType: CASE_TYPES.PAYMENT_FAILURE,
    status: 'recovered',
    priority: CASE_PRIORITY.HIGH,
    amountAtRiskMinor: payment3.amountMinor,
    actualRecoveryMinor: payment3.amountMinor,
    netRecoveryMinor: payment3.amountMinor,
    currency: 'INR',
    failureReason: 'UPI Gateway Timeout',
    failureCode: 'BANK_TIMEOUT',
    expectedRecoveryMinor: payment3.amountMinor,
    recoveryProbability: 0.85,
    resolvedAt: new Date(),
  }).returning();

  // Case for Globex (Tenant isolation)
  await db.insert(revenueCases).values({
    merchantId: globex.id,
    paymentId: paymentG.id,
    customerId: custG1.id,
    orderId: orderG.id,
    caseType: CASE_TYPES.PAYMENT_FAILURE,
    status: 'new',
    priority: CASE_PRIORITY.HIGH,
    amountAtRiskMinor: paymentG.amountMinor,
    currency: 'INR',
    failureReason: paymentG.failureReason,
    failureCode: paymentG.failureCode,
  });

  // ─── 10. Create Audit Trail ─────────────────────────────────────
  await db.insert(auditEvents).values([
    {
      merchantId: acme.id,
      entityType: 'revenue_case',
      entityId: case1.id,
      eventType: EVENT_TYPES.REVENUE_CASE_CREATED,
      actor: 'system',
      data: { amountAtRiskMinor: case1.amountAtRiskMinor, priority: case1.priority },
    },
    {
      merchantId: acme.id,
      entityType: 'revenue_case',
      entityId: case2.id,
      eventType: EVENT_TYPES.REVENUE_CASE_CREATED,
      actor: 'system',
      data: { amountAtRiskMinor: case2.amountAtRiskMinor, priority: case2.priority },
    },
    {
      merchantId: acme.id,
      entityType: 'revenue_case',
      entityId: case3.id,
      eventType: 'case.transitioned_to.recovered',
      actor: 'recovery_executor',
      data: { recoveredAmountMinor: case3.actualRecoveryMinor },
    },
  ]);

  console.log(`✅ Seed complete! Seeded 3 cases for Acme (${acme.id}) and 1 case for Globex (${globex.id})`);
}

// Allow direct execution via tsx / node
if (process.argv[1]?.includes('seed.ts')) {
  runSeed()
    .then(() => {
      console.log('✨ Database successfully seeded.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Seed failed:', err);
      process.exit(1);
    });
}
