/**
 * REVIVE — Money Utilities
 * 
 * All monetary values are stored as BIGINT in minor currency units (paise for INR).
 * This module provides safe arithmetic and formatting for financial calculations.
 * 
 * NEVER use floating point arithmetic for money.
 * 
 * Convention:
 *   ₹24,999 → 2499900 paise
 *   1 INR = 100 paise
 */

import Decimal from 'decimal.js';

// Configure Decimal.js for financial precision
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_EVEN });

/** Minor unit multiplier per currency */
const MINOR_UNIT_MULTIPLIERS: Record<string, number> = {
  INR: 100,
  USD: 100,
  EUR: 100,
  GBP: 100,
};

/**
 * Convert a major unit amount (e.g., ₹24,999) to minor units (e.g., 2499900 paise).
 * Uses Decimal.js for safe conversion.
 */
export function toMinorUnits(majorAmount: number | string, currency: string = 'INR'): number {
  const multiplier = MINOR_UNIT_MULTIPLIERS[currency] ?? 100;
  const result = new Decimal(majorAmount).times(multiplier);
  if (!result.isInteger()) {
    throw new Error(`Cannot represent ${majorAmount} ${currency} as integer minor units`);
  }
  return result.toNumber();
}

/**
 * Convert minor units (e.g., 2499900 paise) to major units (e.g., 24999.00).
 * Returns as Decimal for safe downstream arithmetic.
 */
export function toMajorUnits(minorAmount: number, currency: string = 'INR'): Decimal {
  const multiplier = MINOR_UNIT_MULTIPLIERS[currency] ?? 100;
  return new Decimal(minorAmount).dividedBy(multiplier);
}

/**
 * Format minor units as a human-readable currency string.
 * 2499900 → "₹24,999.00"
 */
export function formatMoney(minorAmount: number, currency: string = 'INR'): string {
  const major = toMajorUnits(minorAmount, currency);
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency;
  
  // Format with Indian numbering system for INR
  if (currency === 'INR') {
    return `${symbol}${formatIndianNumber(major.toNumber())}`;
  }
  
  return `${symbol}${major.toFixed(2)}`;
}

/**
 * Format a number using Indian numbering system (lakhs, crores).
 * 1234567.89 → "12,34,567.89"
 */
function formatIndianNumber(num: number): string {
  const [intPart, decPart] = num.toFixed(2).split('.');
  const lastThree = intPart.slice(-3);
  const otherNumbers = intPart.slice(0, -3);
  
  const formatted = otherNumbers
    ? otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree
    : lastThree;
  
  return `${formatted}.${decPart}`;
}

/**
 * Safe addition of minor unit amounts.
 */
export function addMoney(a: number, b: number): number {
  return new Decimal(a).plus(b).toNumber();
}

/**
 * Safe subtraction of minor unit amounts.
 */
export function subtractMoney(a: number, b: number): number {
  return new Decimal(a).minus(b).toNumber();
}

/**
 * Safe multiplication of a minor unit amount by a factor.
 * Result is rounded to nearest integer (minor unit).
 */
export function multiplyMoney(minorAmount: number, factor: number): number {
  return new Decimal(minorAmount).times(factor).round().toNumber();
}

/**
 * Compare two minor unit amounts.
 * Returns -1, 0, or 1.
 */
export function compareMoney(a: number, b: number): -1 | 0 | 1 {
  const result = new Decimal(a).comparedTo(b);
  return result as -1 | 0 | 1;
}

/**
 * Format minor units in compact Indian format.
 * 1270000000 → "₹1.27Cr"
 * 1860000000 → "₹18.6L"
 */
export function formatMoneyCompact(minorAmount: number, currency: string = 'INR'): string {
  const major = toMajorUnits(minorAmount, currency).toNumber();
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency;
  
  if (currency === 'INR') {
    if (major >= 10000000) {
      return `${symbol}${(major / 10000000).toFixed(1)}Cr`;
    }
    if (major >= 100000) {
      return `${symbol}${(major / 100000).toFixed(1)}L`;
    }
    if (major >= 1000) {
      return `${symbol}${(major / 1000).toFixed(1)}K`;
    }
  }
  
  return formatMoney(minorAmount, currency);
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

export { Decimal };
