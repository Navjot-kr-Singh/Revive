/**
 * REVIVE — Synthetic Transaction & Event Stream Generator
 * 
 * Generates high-volume, deterministic financial event streams with realistic
 * Indian fintech distributions and injectable systemic incident scenarios.
 */

import { SeededRandom } from './seeded-random';
import { CustomerGenerator, type SyntheticCustomer } from './customer-generator';
import { PaymentGenerator, type SyntheticPaymentProfile } from './payment-generator';
import { type DegradationScenarioConfig } from './scenario-generator';
import { EVENT_TYPES, EVENT_SOURCES } from '@/lib/constants';

export interface GeneratedTransaction {
  orderId: string;
  externalOrderId: string;
  customerId: string;
  customer: SyntheticCustomer;
  paymentId: string;
  externalPaymentId: string;
  paymentProfile: SyntheticPaymentProfile;
  status: 'captured' | 'failed' | 'abandoned';
  failureCode?: string;
  failureReason?: string;
  timestamp: Date;
  events: GeneratedEvent[];
}

export interface GeneratedEvent {
  eventId: string;
  eventType: string;
  source: string;
  sourceEventId: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

export interface GenerationOptions {
  seed?: number | string;
  totalTransactions?: number;
  startTime?: Date;
  timeSpanMinutes?: number;
  merchantId: string;
  scenario?: DegradationScenarioConfig | null;
  baselineSuccessRate?: number;
}

export class TransactionGenerator {
  private prng: SeededRandom;
  private customerGen: CustomerGenerator;
  private paymentGen: PaymentGenerator;

  constructor(seed: number | string = 20260826) {
    this.prng = new SeededRandom(seed);
    this.customerGen = new CustomerGenerator(this.prng);
    this.paymentGen = new PaymentGenerator(this.prng);
  }

  /**
   * Generate a batch of N transactions with complete event lifecycles.
   */
  generateStream(options: GenerationOptions): GeneratedTransaction[] {
    const total = options.totalTransactions ?? 10000;
    const startTime = options.startTime ?? new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
    const timeSpanMs = (options.timeSpanMinutes ?? 120) * 60 * 1000;
    const baselineSuccess = options.baselineSuccessRate ?? 0.965;
    const scenario = options.scenario;

    const customersPool: SyntheticCustomer[] = [];
    const poolSize = Math.min(Math.max(100, Math.floor(total / 10)), 2000);
    for (let i = 0; i < poolSize; i++) {
      customersPool.push(this.customerGen.generateCustomer(1000 + i));
    }

    const transactions: GeneratedTransaction[] = [];

    for (let i = 0; i < total; i++) {
      // Stagger timestamp uniformly with small gaussian jitter across timeSpan
      const progressFraction = i / total;
      const baseTimestampMs = startTime.getTime() + progressFraction * timeSpanMs;
      const jitterMs = this.prng.nextInt(-15000, 15000);
      const txTimestamp = new Date(Math.max(startTime.getTime(), baseTimestampMs + jitterMs));

      const customer = this.prng.choice(customersPool);
      const profile = this.paymentGen.generatePaymentProfile();

      const txIndex = (i + 1).toString().padStart(6, '0');
      const orderId = `ord_syn_${txIndex}`;
      const paymentId = `pay_syn_${txIndex}`;

      // Check if transaction falls into active incident scenario
      let isScenarioActive = false;
      let failureRate = 1.0 - baselineSuccess; // e.g. 3.5% normal failure rate
      let scenarioFailureCode: string | undefined;
      let scenarioFailureReason: string | undefined;

      if (scenario) {
        const scenarioStartMs = startTime.getTime() + scenario.startWindowOffsetMinutes * 60 * 1000;
        const scenarioEndMs = scenarioStartMs + scenario.durationMinutes * 60 * 1000;
        const txMs = txTimestamp.getTime();

        if (
          txMs >= scenarioStartMs &&
          txMs <= scenarioEndMs &&
          profile.bank === scenario.targetBank &&
          profile.paymentMethod.startsWith(scenario.targetPaymentMethod)
        ) {
          isScenarioActive = true;
          failureRate = scenario.incidentFailureRate;
          scenarioFailureCode = scenario.failureCode;
          scenarioFailureReason = scenario.failureReason;
        }
      }

      // Determine outcome
      const isFailed = this.prng.chance(failureRate);
      let status: 'captured' | 'failed' | 'abandoned' = 'captured';
      let failureCode: string | undefined;
      let failureReason: string | undefined;

      if (isFailed) {
        status = 'failed';
        if (isScenarioActive && scenarioFailureCode) {
          failureCode = scenarioFailureCode;
          failureReason = scenarioFailureReason;
        } else {
          const failDef = this.paymentGen.generateFailure(profile.paymentMethod);
          failureCode = failDef.code;
          failureReason = failDef.description;
        }
      }

      // Build sequence of lifecycle events for this transaction
      const events: GeneratedEvent[] = [];
      const baseIso = txTimestamp.toISOString();

      // 1. checkout.started
      events.push({
        eventId: `evt_chk_start_${txIndex}`,
        eventType: EVENT_TYPES.CHECKOUT_STARTED,
        source: EVENT_SOURCES.SYNTHETIC,
        sourceEventId: `src_chk_${txIndex}`,
        timestamp: baseIso,
        payload: {
          merchant_id: options.merchantId,
          order_id: orderId,
          customer_id: customer.externalId,
          amount_minor: profile.amountMinor,
          currency: profile.currency,
          platform: profile.platform,
          city: profile.city,
        },
      });

      // 2. payment.created
      events.push({
        eventId: `evt_pay_create_${txIndex}`,
        eventType: EVENT_TYPES.PAYMENT_CREATED,
        source: EVENT_SOURCES.SYNTHETIC,
        sourceEventId: `src_pay_create_${txIndex}`,
        timestamp: new Date(txTimestamp.getTime() + 1200).toISOString(),
        payload: {
          merchant_id: options.merchantId,
          payment_id: paymentId,
          order_id: orderId,
          customer_id: customer.externalId,
          amount_minor: profile.amountMinor,
          currency: profile.currency,
          payment_method: profile.paymentMethod,
          bank: profile.bank,
        },
      });

      if (status === 'captured') {
        // payment.authorized -> payment.captured -> checkout.completed
        events.push({
          eventId: `evt_pay_auth_${txIndex}`,
          eventType: EVENT_TYPES.PAYMENT_AUTHORIZED,
          source: EVENT_SOURCES.SYNTHETIC,
          sourceEventId: `src_pay_auth_${txIndex}`,
          timestamp: new Date(txTimestamp.getTime() + 3400).toISOString(),
          payload: {
            merchant_id: options.merchantId,
            payment_id: paymentId,
            order_id: orderId,
            amount_minor: profile.amountMinor,
            currency: profile.currency,
          },
        });

        events.push({
          eventId: `evt_pay_capt_${txIndex}`,
          eventType: EVENT_TYPES.PAYMENT_CAPTURED,
          source: EVENT_SOURCES.SYNTHETIC,
          sourceEventId: `src_pay_capt_${txIndex}`,
          timestamp: new Date(txTimestamp.getTime() + 4100).toISOString(),
          payload: {
            merchant_id: options.merchantId,
            payment_id: paymentId,
            order_id: orderId,
            amount_minor: profile.amountMinor,
            currency: profile.currency,
            bank: profile.bank,
            payment_method: profile.paymentMethod,
          },
        });

        events.push({
          eventId: `evt_chk_comp_${txIndex}`,
          eventType: EVENT_TYPES.CHECKOUT_COMPLETED,
          source: EVENT_SOURCES.SYNTHETIC,
          sourceEventId: `src_chk_comp_${txIndex}`,
          timestamp: new Date(txTimestamp.getTime() + 4300).toISOString(),
          payload: {
            merchant_id: options.merchantId,
            order_id: orderId,
            customer_id: customer.externalId,
            amount_minor: profile.amountMinor,
          },
        });
      } else {
        // payment.failed -> checkout.abandoned
        events.push({
          eventId: `evt_pay_fail_${txIndex}`,
          eventType: EVENT_TYPES.PAYMENT_FAILED,
          source: EVENT_SOURCES.SYNTHETIC,
          sourceEventId: `src_pay_fail_${txIndex}`,
          timestamp: new Date(txTimestamp.getTime() + 2900).toISOString(),
          payload: {
            merchant_id: options.merchantId,
            payment_id: paymentId,
            order_id: orderId,
            customer_id: customer.externalId,
            amount_minor: profile.amountMinor,
            currency: profile.currency,
            payment_method: profile.paymentMethod,
            bank: profile.bank,
            failure_code: failureCode,
            failure_reason: failureReason,
            platform: profile.platform,
            city: profile.city,
          },
        });

        events.push({
          eventId: `evt_chk_aban_${txIndex}`,
          eventType: EVENT_TYPES.CHECKOUT_ABANDONED,
          source: EVENT_SOURCES.SYNTHETIC,
          sourceEventId: `src_chk_aban_${txIndex}`,
          timestamp: new Date(txTimestamp.getTime() + 3500).toISOString(),
          payload: {
            merchant_id: options.merchantId,
            order_id: orderId,
            customer_id: customer.externalId,
            amount_minor: profile.amountMinor,
            reason: failureCode,
          },
        });
      }

      transactions.push({
        orderId,
        externalOrderId: `ORD-SYN-${txIndex}`,
        customerId: customer.externalId,
        customer,
        paymentId,
        externalPaymentId: `pay_rzp_syn_${txIndex}`,
        paymentProfile: profile,
        status,
        failureCode,
        failureReason,
        timestamp: txTimestamp,
        events,
      });
    }

    return transactions;
  }
}
