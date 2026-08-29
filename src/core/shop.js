/**
 * Gemeinsamer Einheitenpool und Laden.
 *
 * Alle acht Spieler ziehen aus demselben Pool – wer eine Einheit kauft,
 * nimmt sie den anderen weg. Verkaufte Einheiten wandern zurück.
 */
import { UNITS, UNIT_BY_ID, POOL_GROESSE } from './units.js';

export const LADEN_PLAETZE = 5;
export const REROLL_KOSTEN = 2;
export const XP_KOSTEN = 4;
export const XP_PRO_KAUF = 4;

/** Wahrscheinlichkeiten (in %) je Stufe für die Kostenstufen 1..5. */
export const CHANCEN = {
  1: [100, 0, 0, 0, 0],
  2: [100, 0, 0, 0, 0],
  3: [75, 25, 0, 0, 0],
  4: [55, 30, 15, 0, 0],
  5: [45, 33, 20, 2, 0],
  6: [30, 40, 25, 5, 0],
  7: [19, 35, 35, 10, 1],
  8: [15, 25, 35, 20, 5],
  9: [10, 15, 30, 30, 15],
};

/** Benötigte XP, um die jeweilige Stufe zu erreichen (Index = Zielstufe - 2). */
export const XP_SCHWELLEN = [2, 2, 6, 10, 20, 36, 56, 80];
export const MAX_STUFE = 9;

export class Pool {
  constructor() {
    this.bestand = {};
    for (const u of UNITS) this.bestand[u.id] = POOL_GROESSE[u.kosten];
  }

  verfuegbar(defId) {
    return this.bestand[defId] || 0;
  }

  entnehmen(defId, anzahl = 1) {
    this.bestand[defId] = Math.max(0, (this.bestand[defId] || 0) - anzahl);
  }

  zurueck(defId, anzahl = 1) {
    const max = POOL_GROESSE[UNIT_BY_ID[defId].kosten];
    this.bestand[defId] = Math.min(max, (this.bestand[defId] || 0) + anzahl);
  }

  /** Wie viele Exemplare eine Einheit auf gegebener Sternstufe gebunden hat. */
  static kopien(stern) {
    return Math.pow(3, stern - 1);
  }
}

/** Würfelt fünf Ladenplätze für eine Spielerstufe aus. */
export function wuerfleLaden(pool, stufe, rng) {
  const chancen = CHANCEN[Math.min(MAX_STUFE, Math.max(1, stufe))];
  const plaetze = [];
  for (let i = 0; i < LADEN_PLAETZE; i++) {
    plaetze.push(zieheEinheit(pool, chancen, rng));
  }
  return plaetze;
}

function zieheEinheit(pool, chancen, rng) {
  const versuche = [rng.gewichtet(chancen) + 1];
  // Falls die gezogene Kostenstufe leer ist, absteigend weitersuchen.
  for (let k = 5; k >= 1; k--) if (!versuche.includes(k)) versuche.push(k);

  for (const kosten of versuche) {
    const kandidaten = UNITS.filter((u) => u.kosten === kosten && pool.verfuegbar(u.id) > 0);
    if (!kandidaten.length) continue;
    const gewichte = kandidaten.map((u) => pool.verfuegbar(u.id));
    const gewaehlt = kandidaten[rng.gewichtet(gewichte)];
    pool.entnehmen(gewaehlt.id, 1);
    return gewaehlt.id;
  }
  return null;
}

/** XP-Bedarf für den nächsten Stufenaufstieg. */
export function xpFuerNaechsteStufe(stufe) {
  if (stufe >= MAX_STUFE) return null;
  return XP_SCHWELLEN[stufe - 1];
}
