/**
 * REVIVE — Seeded Random Number Generator
 * 
 * High-performance deterministic PRNG (Mulberry32 + Box-Muller transform)
 * Guarantees 100% reproducible synthetic financial datasets.
 */

export class SeededRandom {
  private state: number;

  constructor(seed: number | string = 20260826) {
    if (typeof seed === 'string') {
      let h = 2166136261 >>> 0;
      for (let i = 0; i < seed.length; i++) {
        h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
      }
      this.state = h >>> 0;
    } else {
      this.state = Math.floor(seed) >>> 0;
    }
  }

  /**
   * Mulberry32 algorithm: returns a float in [0, 1)
   */
  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Return integer in [min, max] inclusive
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Return float in [min, max)
   */
  nextFloat(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /**
   * Return true with probability p (0 to 1)
   */
  chance(probability: number): boolean {
    return this.next() < probability;
  }

  /**
   * Random element from array
   */
  choice<T>(array: readonly T[]): T {
    if (array.length === 0) throw new Error('Cannot choose from empty array');
    const index = this.nextInt(0, array.length - 1);
    return array[index];
  }

  /**
   * Weighted random choice
   */
  weightedChoice<T>(items: readonly T[], weights: readonly number[]): T {
    if (items.length !== weights.length || items.length === 0) {
      throw new Error('Items and weights must have equal non-zero length');
    }
    const totalWeight = weights.reduce((acc, w) => acc + w, 0);
    let random = this.next() * totalWeight;

    for (let i = 0; i < items.length; i++) {
      if (random < weights[i]) {
        return items[i];
      }
      random -= weights[i];
    }
    return items[items.length - 1];
  }

  /**
   * Box-Muller Gaussian / Normal Distribution
   */
  gaussian(mean: number = 0, stdDev: number = 1): number {
    let u = 0;
    let v = 0;
    while (u === 0) u = this.next();
    while (v === 0) v = this.next();
    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return z * stdDev + mean;
  }
}
