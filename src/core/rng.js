/**
 * Deterministischer Zufallsgenerator (mulberry32).
 * Gleicher Seed => gleicher Spielverlauf. Wichtig für reproduzierbare Kämpfe
 * und für die Tests.
 */
export class RNG {
  constructor(seed = Date.now()) {
    this.zustand = seed >>> 0;
  }

  /** Zufallszahl in [0,1). */
  next() {
    this.zustand = (this.zustand + 0x6d2b79f5) >>> 0;
    let t = this.zustand;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Ganzzahl in [0, n). */
  int(n) {
    return Math.floor(this.next() * n);
  }

  /** Zufälliges Element. */
  pick(arr) {
    return arr[this.int(arr.length)];
  }

  /** Trifft mit Wahrscheinlichkeit p (0..1). */
  chance(p) {
    return this.next() < p;
  }

  /** Fisher-Yates, verändert das Array in place und gibt es zurück. */
  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.int(i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /** Wählt einen Index anhand von Gewichten. */
  gewichtet(gewichte) {
    const summe = gewichte.reduce((a, b) => a + b, 0);
    let r = this.next() * summe;
    for (let i = 0; i < gewichte.length; i++) {
      r -= gewichte[i];
      if (r < 0) return i;
    }
    return gewichte.length - 1;
  }
}
