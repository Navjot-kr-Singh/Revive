/**
 * REVIVE — Event Aggregation Engine
 * 
 * Aggregates payment transaction streams across sliding time windows
 * and slices across dimensions (bank, payment_method, merchant, failure_code).
 */

import { getDb } from '@/server/db';
import { paymentEvents } from '@/server/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { EVENT_TYPES } from '@/lib/constants';

export interface WindowMetrics {
  dimension: string; // e.g. "bank:HDFC Bank|method:upi"
  bank?: string;
  paymentMethod?: string;
  merchantId: string;
  windowStart: Date;
  windowEnd: Date;
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  successRate: number;
  failureRate: number;
  totalGmvMinor: number;
  failedGmvMinor: number;
  avgTicketMinor: number;
  failuresByCode: Record<string, number>;
}

export interface AggregationOptions {
  merchantId: string;
  windowMinutes: number; // e.g. 5, 15, 60
  startTime?: Date;
  endTime?: Date;
  sliceBy?: ('bank' | 'payment_method' | 'bank_and_method')[];
}

export class AggregationEngine {
  /**
   * Aggregate events from database within a time window.
   */
  static async aggregateWindow(options: AggregationOptions): Promise<WindowMetrics[]> {
    const db = getDb();
    const endTime = options.endTime ?? new Date();
    const startTime = options.startTime ?? new Date(endTime.getTime() - options.windowMinutes * 60 * 1000);

    // Query all payment events for this merchant in the window
    const events = await db
      .select()
      .from(paymentEvents)
      .where(
        and(
          eq(paymentEvents.merchantId, options.merchantId),
          gte(paymentEvents.receivedAt, startTime),
          lte(paymentEvents.receivedAt, endTime),
        )
      );

    return this.aggregateFromEvents(events, options.merchantId, startTime, endTime);
  }

  /**
   * High-performance in-memory aggregation of a collection of raw events.
   * Used for both batch evaluation benchmarks and real-time sliding windows.
   */
  static aggregateFromEvents(
    events: (typeof paymentEvents.$inferSelect)[],
    merchantId: string,
    windowStart: Date,
    windowEnd: Date
  ): WindowMetrics[] {
    const sliceMap = new Map<string, {
      bank: string;
      paymentMethod: string;
      total: number;
      success: number;
      failed: number;
      totalGmv: number;
      failedGmv: number;
      failuresByCode: Record<string, number>;
    }>();

    for (const ev of events) {
      const payload = ev.payload as Record<string, unknown>;
      const bank = (payload.bank as string) || 'UNKNOWN_BANK';
      const paymentMethod = (payload.payment_method as string) || 'unknown';
      const amountMinor = Number(payload.amount_minor ?? 0);
      const isFailed = ev.eventType === EVENT_TYPES.PAYMENT_FAILED;
      const isSuccess = ev.eventType === EVENT_TYPES.PAYMENT_CAPTURED || ev.eventType === EVENT_TYPES.PAYMENT_AUTHORIZED;

      // Only count lifecycle outcome events to avoid double counting started/created
      if (!isFailed && !isSuccess) continue;

      const key = `${bank}|${paymentMethod}`;
      let stat = sliceMap.get(key);
      if (!stat) {
        stat = {
          bank,
          paymentMethod,
          total: 0,
          success: 0,
          failed: 0,
          totalGmv: 0,
          failedGmv: 0,
          failuresByCode: {},
        };
        sliceMap.set(key, stat);
      }

      stat.total++;
      stat.totalGmv += amountMinor;

      if (isSuccess) {
        stat.success++;
      } else if (isFailed) {
        stat.failed++;
        stat.failedGmv += amountMinor;
        const code = (payload.failure_code as string) || 'UNKNOWN';
        stat.failuresByCode[code] = (stat.failuresByCode[code] || 0) + 1;
      }
    }

    const results: WindowMetrics[] = [];
    for (const [key, s] of sliceMap.entries()) {
      if (s.total === 0) continue;
      const failureRate = s.failed / s.total;
      const successRate = s.success / s.total;
      const avgTicket = Math.round(s.totalGmv / s.total);

      results.push({
        dimension: key,
        bank: s.bank,
        paymentMethod: s.paymentMethod,
        merchantId,
        windowStart,
        windowEnd,
        totalTransactions: s.total,
        successfulTransactions: s.success,
        failedTransactions: s.failed,
        successRate,
        failureRate,
        totalGmvMinor: s.totalGmv,
        failedGmvMinor: s.failedGmv,
        avgTicketMinor: avgTicket,
        failuresByCode: s.failuresByCode,
      });
    }

    return results;
  }
}
