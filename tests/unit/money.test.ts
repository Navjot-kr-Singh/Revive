import { describe, it, expect } from 'vitest';
import {
  toMinorUnits,
  toMajorUnits,
  formatMoney,
  formatMoneyCompact,
  addMoney,
  subtractMoney,
  multiplyMoney,
  compareMoney,
  probabilityToBps,
  bpsToProbability,
  calculateExpectedRecoveryMinor,
  calculateExpectedNetValueMinor,
} from '@/lib/money';

describe('Money Utilities', () => {
  describe('toMinorUnits', () => {
    it('converts ₹0 correctly', () => {
      expect(toMinorUnits(0, 'INR')).toBe(0);
    });

    it('converts ₹1 correctly', () => {
      expect(toMinorUnits(1, 'INR')).toBe(100);
    });

    it('converts ₹99 correctly', () => {
      expect(toMinorUnits(99, 'INR')).toBe(9900);
    });

    it('converts ₹100 correctly', () => {
      expect(toMinorUnits(100, 'INR')).toBe(10000);
    });

    it('converts ₹999 correctly', () => {
      expect(toMinorUnits(999, 'INR')).toBe(99900);
    });

    it('converts ₹24,999 correctly', () => {
      expect(toMinorUnits(24999, 'INR')).toBe(2499900);
    });

    it('converts ₹50,000 correctly', () => {
      expect(toMinorUnits(50000, 'INR')).toBe(5000000);
    });

    it('converts ₹1,00,000 correctly', () => {
      expect(toMinorUnits(100000, 'INR')).toBe(10000000);
    });

    it('converts decimal amounts correctly', () => {
      expect(toMinorUnits(24999.50, 'INR')).toBe(2499950);
    });

    it('converts string amounts correctly', () => {
      expect(toMinorUnits('24999', 'INR')).toBe(2499900);
    });

    it('throws for amounts that cannot be represented as integer minor units', () => {
      expect(() => toMinorUnits(24999.999, 'INR')).toThrow();
    });
  });

  describe('toMajorUnits', () => {
    it('converts 0 paise correctly', () => {
      expect(toMajorUnits(0, 'INR').toNumber()).toBe(0);
    });

    it('converts 2499900 paise to ₹24,999', () => {
      expect(toMajorUnits(2499900, 'INR').toNumber()).toBe(24999);
    });

    it('converts 100 paise to ₹1', () => {
      expect(toMajorUnits(100, 'INR').toNumber()).toBe(1);
    });

    it('converts 5000000 paise to ₹50,000', () => {
      expect(toMajorUnits(5000000, 'INR').toNumber()).toBe(50000);
    });
  });

  describe('formatMoney', () => {
    it('formats ₹0', () => {
      expect(formatMoney(0, 'INR')).toBe('₹0.00');
    });

    it('formats ₹24,999', () => {
      expect(formatMoney(2499900, 'INR')).toBe('₹24,999.00');
    });

    it('formats ₹1,00,000 with Indian numbering', () => {
      expect(formatMoney(10000000, 'INR')).toBe('₹1,00,000.00');
    });

    it('formats ₹999', () => {
      expect(formatMoney(99900, 'INR')).toBe('₹999.00');
    });
  });

  describe('formatMoneyCompact', () => {
    it('formats lakhs', () => {
      expect(formatMoneyCompact(1270000000, 'INR')).toBe('₹1.3Cr');
    });

    it('formats crores', () => {
      expect(formatMoneyCompact(127000000, 'INR')).toBe('₹12.7L');
    });
  });

  describe('arithmetic', () => {
    it('adds money safely', () => {
      expect(addMoney(2499900, 100)).toBe(2500000);
    });

    it('subtracts money safely', () => {
      expect(subtractMoney(2499900, 100)).toBe(2499800);
    });

    it('multiplies money safely', () => {
      expect(multiplyMoney(2499900, 0.5)).toBe(1249950);
    });

    it('rounds multiplication correctly', () => {
      expect(multiplyMoney(100, 0.33)).toBe(33);
    });

    it('compares money correctly', () => {
      expect(compareMoney(100, 200)).toBe(-1);
      expect(compareMoney(200, 200)).toBe(0);
      expect(compareMoney(300, 200)).toBe(1);
    });
  });

  describe('basis points & expected value arithmetic', () => {
    it('converts probabilities to basis points accurately (0%, 1%, 12.5%, 38%, 99.99%, 100%)', () => {
      expect(probabilityToBps(0.0)).toBe(0);
      expect(probabilityToBps(0.01)).toBe(100);
      expect(probabilityToBps(0.125)).toBe(1250);
      expect(probabilityToBps(0.38)).toBe(3800);
      expect(probabilityToBps(0.9999)).toBe(9999);
      expect(probabilityToBps(1.0)).toBe(10000);
    });

    it('converts basis points to probabilities accurately', () => {
      expect(bpsToProbability(0)).toBe(0.0);
      expect(bpsToProbability(100)).toBe(0.01);
      expect(bpsToProbability(1250)).toBe(0.125);
      expect(bpsToProbability(3800)).toBe(0.38);
      expect(bpsToProbability(9999)).toBe(0.9999);
      expect(bpsToProbability(10000)).toBe(1.0);
    });

    it('calculates expected recovery in integer minor units (floor)', () => {
      // ₹24,999 (2499900 paise) at 38% (3800 bps) -> floor(2499900 * 3800 / 10000) = 949962 paise (₹9,499.62)
      expect(calculateExpectedRecoveryMinor(2499900, 3800)).toBe(949962);

      // ₹10,000 (1000000 paise) at 37% (3700 bps) -> 370000 paise (₹3,700.00)
      expect(calculateExpectedRecoveryMinor(1000000, 3700)).toBe(370000);

      // ₹24,999 at 12% (1200 bps) -> floor(2499900 * 1200 / 10000) = 299988 paise (₹2,999.88)
      expect(calculateExpectedRecoveryMinor(2499900, 1200)).toBe(299988);

      // ₹24,999 at 21% (2100 bps) -> floor(2499900 * 2100 / 10000) = 524979 paise (₹5,249.79)
      expect(calculateExpectedRecoveryMinor(2499900, 2100)).toBe(524979);

      // ₹24,999 at 0% -> 0
      expect(calculateExpectedRecoveryMinor(2499900, 0)).toBe(0);

      // ₹24,999 at 100% -> 2499900
      expect(calculateExpectedRecoveryMinor(2499900, 10000)).toBe(2499900);
    });

    it('calculates expected net value (EV) in minor units subtracting cost, friction, and risk', () => {
      // Expected recovery: ₹3,700 (370000 paise)
      // Cost: ₹50 (5000 paise), Friction: ₹100 (10000 paise), Risk: ₹0
      // EV = 370000 - 5000 - 10000 - 0 = 355000 paise (₹3,550.00)
      const ev = calculateExpectedNetValueMinor(370000, 5000, 10000, 0);
      expect(ev).toBe(355000);
    });
  });
});

