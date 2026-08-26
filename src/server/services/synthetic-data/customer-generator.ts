/**
 * REVIVE — Synthetic Customer Generator
 * 
 * Generates synthetic customer profiles with realistic segment distributions,
 * historical order volumes, and lifetime value in Indian Rupees.
 */

import { SeededRandom } from './seeded-random';
import { toMinorUnits } from '@/lib/money';
import { createHash } from 'crypto';

export interface SyntheticCustomer {
  externalId: string;
  displayId: string;
  emailHash: string;
  segment: 'VIP' | 'Loyal' | 'Repeat' | 'New';
  totalOrders: number;
  totalSuccessPayments: number;
  totalFailedPayments: number;
  lifetimeValueMinor: number;
  currency: string;
  city: string;
}

export class CustomerGenerator {
  private prng: SeededRandom;
  private counter: number = 1000;

  constructor(prng: SeededRandom) {
    this.prng = prng;
  }

  generateCustomer(index?: number): SyntheticCustomer {
    const custId = index ?? ++this.counter;
    const segment = this.prng.weightedChoice(
      ['VIP', 'Loyal', 'Repeat', 'New'] as const,
      [5, 20, 35, 40]
    );

    let totalOrders = 1;
    let successRate = 0.85;
    let avgTicketRupees = 1500;

    switch (segment) {
      case 'VIP':
        totalOrders = this.prng.nextInt(40, 120);
        successRate = 0.98;
        avgTicketRupees = this.prng.nextInt(8000, 25000);
        break;
      case 'Loyal':
        totalOrders = this.prng.nextInt(12, 39);
        successRate = 0.95;
        avgTicketRupees = this.prng.nextInt(3500, 12000);
        break;
      case 'Repeat':
        totalOrders = this.prng.nextInt(2, 11);
        successRate = 0.92;
        avgTicketRupees = this.prng.nextInt(1200, 5000);
        break;
      case 'New':
        totalOrders = 1;
        successRate = 0.85;
        avgTicketRupees = this.prng.nextInt(500, 3000);
        break;
    }

    const successCount = Math.round(totalOrders * successRate);
    const failedCount = totalOrders - successCount;
    const ltvMinor = toMinorUnits(successCount * avgTicketRupees, 'INR');

    const rawEmail = `customer_${custId}@revivedemo.in`;
    const emailHash = createHash('sha256').update(rawEmail).digest('hex');

    return {
      externalId: `ext_cust_${custId}`,
      displayId: `CUST-${custId}`,
      emailHash,
      segment,
      totalOrders,
      totalSuccessPayments: successCount,
      totalFailedPayments: failedCount,
      lifetimeValueMinor: ltvMinor,
      currency: 'INR',
      city: this.prng.choice(['Bengaluru', 'Mumbai', 'Delhi', 'Hyderabad', 'Pune', 'Chennai']),
    };
  }
}
