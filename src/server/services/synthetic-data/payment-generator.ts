/**
 * REVIVE — Indian Fintech Payment Generator
 * 
 * Generates synthetic Indian payment profiles with realistic distributions
 * across payment methods (UPI, Card, Netbanking, Wallet), banks, and ticket sizes.
 */

import { SeededRandom } from './seeded-random';
import { toMinorUnits } from '@/lib/money';
import { FAILURE_TAXONOMY, type FailureDefinition } from '@/lib/constants';

export interface SyntheticPaymentMethod {
  method: 'upi' | 'card_debit' | 'card_credit' | 'netbanking' | 'wallet';
  subtype?: string;
  network?: string;
}

export interface SyntheticPaymentProfile {
  amountMinor: number;
  currency: string;
  paymentMethod: string;
  bank: string;
  paymentSubtype?: string;
  cardNetwork?: string;
  isRecurring: boolean;
  platform: 'android' | 'ios' | 'web';
  city: string;
}

export class PaymentGenerator {
  private prng: SeededRandom;

  constructor(prng: SeededRandom) {
    this.prng = prng;
  }

  // ─── Indian Banks & Weightings ──────────────────────────────────
  private static readonly BANKS = [
    'HDFC Bank',
    'State Bank of India',
    'ICICI Bank',
    'Axis Bank',
    'Kotak Mahindra Bank',
    'Punjab National Bank',
    'Bank of Baroda',
    'Yes Bank',
  ] as const;

  private static readonly BANK_WEIGHTS = [24, 20, 18, 14, 10, 6, 5, 3] as const;

  // ─── Payment Methods & Weightings ───────────────────────────────
  private static readonly METHODS: readonly SyntheticPaymentMethod[] = [
    { method: 'upi', subtype: 'upi_intent' }, // 30%
    { method: 'upi', subtype: 'upi_collect' }, // 10%
    { method: 'upi', subtype: 'upi_qr' }, // 5%
    { method: 'card_debit', network: 'RuPay' }, // 12%
    { method: 'card_debit', network: 'Visa' }, // 8%
    { method: 'card_debit', network: 'Mastercard' }, // 5%
    { method: 'card_credit', network: 'Visa' }, // 8%
    { method: 'card_credit', network: 'Mastercard' }, // 5%
    { method: 'card_credit', network: 'RuPay' }, // 2%
    { method: 'netbanking' }, // 10%
    { method: 'wallet', subtype: 'amazon_pay' }, // 3%
    { method: 'wallet', subtype: 'paytm_wallet' }, // 2%
  ];

  private static readonly METHOD_WEIGHTS = [30, 10, 5, 12, 8, 5, 8, 5, 2, 10, 3, 2];

  // ─── Cities & Weightings ─────────────────────────────────────────
  private static readonly CITIES = [
    'Bengaluru',
    'Mumbai',
    'Delhi NCR',
    'Hyderabad',
    'Chennai',
    'Pune',
    'Kolkata',
    'Ahmedabad',
    'Jaipur',
    'Chandigarh',
  ] as const;

  private static readonly CITY_WEIGHTS = [28, 22, 18, 10, 8, 5, 3, 2, 2, 2];

  /**
   * Generate an amount adhering to Indian e-commerce distribution
   */
  generateAmountMinor(): number {
    const bucket = this.prng.weightedChoice(
      ['micro', 'small', 'medium', 'large', 'premium'] as const,
      [15, 30, 30, 18, 7]
    );

    let amountRupees = 0;
    switch (bucket) {
      case 'micro':
        // ₹49 – ₹499
        amountRupees = this.prng.nextInt(49, 499);
        break;
      case 'small':
        // ₹500 – ₹2,999
        amountRupees = this.prng.nextInt(500, 2999);
        break;
      case 'medium':
        // ₹3,000 – ₹14,999
        amountRupees = this.prng.nextInt(3000, 14999);
        break;
      case 'large':
        // ₹15,000 – ₹49,999
        amountRupees = this.prng.nextInt(15000, 49999);
        break;
      case 'premium':
        // ₹50,000 – ₹1,25,000
        amountRupees = this.prng.nextInt(50000, 125000);
        break;
    }

    return toMinorUnits(amountRupees, 'INR');
  }

  /**
   * Generate a complete realistic payment profile
   */
  generatePaymentProfile(): SyntheticPaymentProfile {
    const methodObj = this.prng.weightedChoice(PaymentGenerator.METHODS, PaymentGenerator.METHOD_WEIGHTS);
    const bank = this.prng.weightedChoice(PaymentGenerator.BANKS, PaymentGenerator.BANK_WEIGHTS);
    const city = this.prng.weightedChoice(PaymentGenerator.CITIES, PaymentGenerator.CITY_WEIGHTS);
    const platform = this.prng.weightedChoice(['android', 'ios', 'web'] as const, [65, 20, 15]);

    return {
      amountMinor: this.generateAmountMinor(),
      currency: 'INR',
      paymentMethod: methodObj.method,
      bank,
      paymentSubtype: methodObj.subtype,
      cardNetwork: methodObj.network,
      isRecurring: this.prng.chance(0.08), // 8% subscription / recurring
      platform,
      city,
    };
  }

  /**
   * Generate a failure code according to realistic Indian banking failure rates
   */
  generateFailure(method: string): FailureDefinition {
    const codes = Object.keys(FAILURE_TAXONOMY);
    const weights = codes.map((c) => {
      const def = FAILURE_TAXONOMY[c];
      let weight = def.historicalProbability * 100;

      // Method-specific affinity
      if (method.startsWith('upi') && (c === 'UPI_TIMEOUT' || c === 'UPI_DECLINED' || c === 'BANK_TIMEOUT')) {
        weight *= 2.0;
      }
      if (method.startsWith('card') && (c === 'CARD_DECLINED' || c === 'CARD_EXPIRED' || c === 'AUTHENTICATION_FAILURE')) {
        weight *= 2.5;
      }
      return weight;
    });

    const chosenCode = this.prng.weightedChoice(codes, weights);
    return FAILURE_TAXONOMY[chosenCode];
  }
}
