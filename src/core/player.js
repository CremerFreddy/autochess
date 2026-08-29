/**
 * Spielerzustand (Mensch wie KI) und alle Aktionen der Vorbereitungsphase.
 */
import { UNIT_BY_ID, verkaufspreis } from './units.js';
import { Pool, wuerfleLaden, REROLL_KOSTEN, XP_KOSTEN, XP_PRO_KAUF, xpFuerNaechsteStufe, MAX_STUFE } from './shop.js';
import { BANK_PLAETZE, EIGENE_REIHEN } from './board.js';

let uidZaehler = 1;
export const neueUid = () => uidZaehler++;

export function erstelleSpieler(id, name, istMensch, farbe) {
  return {
    id, name, istMensch, farbe,
    gold: 2,
    stufe: 2,
    xp: 0,
    leben: 100,
    streak: 0,
    tot: false,
    platz: null,
    einheiten: [],
    laden: [],
    gesperrt: false,
    letztesErgebnis: null,
    verlaufSchaden: 0,
  };
}

export const brettEinheiten = (s) => s.einheiten.filter((e) => e.feld.typ === 'brett');
export const bankEinheiten = (s) => s.einheiten.filter((e) => e.feld.typ === 'bank');
export const maxEinheiten = (s) => s.stufe;
export const findeEinheit = (s, uid) => s.einheiten.find((e) => e.uid === uid) || null;

export function freierBankplatz(s) {
  const belegt = new Set(bankEinheiten(s).map((e) => e.feld.slot));
  for (let i = 0; i < BANK_PLAETZE; i++) if (!belegt.has(i)) return i;
  return -1;
}

export function feldFrei(s, x, y) {
  return !brettEinheiten(s).some((e) => e.feld.x === x && e.feld.y === y);
}

/** Kauft den Ladenplatz `index`. Gibt die neue/aufgewertete Einheit oder null zurück. */
export function kaufen(s, pool, index) {
  const defId = s.laden[index];
  if (!defId) return null;
  const def = UNIT_BY_ID[defId];
  if (s.gold < def.kosten) return null;

  const slot = freierBankplatz(s);
  const wuerdeVerschmelzen = s.einheiten.filter((e) => e.defId === defId && e.stern === 1).length >= 2;
  if (slot === -1 && !wuerdeVerschmelzen) return null;

  s.gold -= def.kosten;
  s.laden[index] = null;
  const einheit = { uid: neueUid(), defId, stern: 1, feld: { typ: 'bank', slot: slot === -1 ? BANK_PLAETZE : slot } };
  s.einheiten.push(einheit);
  return verschmelze(s, defId) || einheit;
}

/**
 * Verschmilzt je drei gleiche Einheiten derselben Sternstufe.
 * Gibt die höchste entstandene Einheit zurück (oder null).
 */
export function verschmelze(s, defId) {
  let ergebnis = null;
  for (let stern = 1; stern <= 2; stern++) {
    let weiter = true;
    while (weiter) {
      const gleiche = s.einheiten.filter((e) => e.defId === defId && e.stern === stern);
      if (gleiche.length < 3) { weiter = false; break; }
      const drei = gleiche.slice(0, 3);
      // Position: bevorzugt ein bereits besetztes Brettfeld.
      const aufBrett = drei.find((e) => e.feld.typ === 'brett');
      const feld = aufBrett ? { ...aufBrett.feld } : { ...drei[0].feld };
      for (const e of drei) {
        const i = s.einheiten.indexOf(e);
        s.einheiten.splice(i, 1);
      }
      const neu = { uid: neueUid(), defId, stern: stern + 1, feld };
      s.einheiten.push(neu);
      ergebnis = neu;
      normalisiereBank(s);
    }
  }
  return ergebnis;
}

/** Räumt doppelte oder ungültige Bankplätze auf. */
export function normalisiereBank(s) {
  const bank = bankEinheiten(s).sort((a, b) => a.feld.slot - b.feld.slot);
  const belegt = new Set();
  for (const e of bank) {
    let slot = e.feld.slot;
    if (slot < 0 || slot >= BANK_PLAETZE || belegt.has(slot)) {
      slot = -1;
      for (let i = 0; i < BANK_PLAETZE; i++) if (!belegt.has(i)) { slot = i; break; }
    }
    e.feld.slot = slot;
    belegt.add(slot);
  }
}

export function verkaufen(s, pool, uid) {
  const e = findeEinheit(s, uid);
  if (!e) return 0;
  const def = UNIT_BY_ID[e.defId];
  const preis = verkaufspreis(def, e.stern);
  s.gold += preis;
  pool.zurueck(e.defId, Pool.kopien(e.stern));
  s.einheiten.splice(s.einheiten.indexOf(e), 1);
  return preis;
}

/**
 * Setzt eine Einheit auf ein Brettfeld. Ist das Feld belegt, tauschen beide
 * die Plätze. Gibt false zurück, wenn der Zug nicht erlaubt ist.
 */
export function aufBrett(s, uid, x, y) {
  const e = findeEinheit(s, uid);
  if (!e) return false;
  if (!EIGENE_REIHEN.includes(y)) return false;
  const belegtVon = brettEinheiten(s).find((o) => o.feld.x === x && o.feld.y === y);
  if (belegtVon === e) return true;

  const kamVonBank = e.feld.typ === 'bank';
  if (kamVonBank && !belegtVon && brettEinheiten(s).length >= maxEinheiten(s)) return false;

  const altesFeld = { ...e.feld };
  e.feld = { typ: 'brett', x, y };
  if (belegtVon) belegtVon.feld = altesFeld;
  normalisiereBank(s);
  return true;
}

export function aufBank(s, uid, slot) {
  const e = findeEinheit(s, uid);
  if (!e) return false;
  const belegtVon = bankEinheiten(s).find((o) => o.feld.slot === slot);
  if (belegtVon === e) return true;
  if (belegtVon && e.feld.typ === 'bank') {
    const tmp = belegtVon.feld.slot;
    belegtVon.feld.slot = e.feld.slot;
    e.feld.slot = tmp;
    return true;
  }
  if (belegtVon) {
    // e steht hier zwingend auf dem Brett (Bank-Bank ist oben erledigt):
    // Der Tausch lässt die Anzahl der Brett-Einheiten unverändert.
    belegtVon.feld = { ...e.feld };
  }
  e.feld = { typ: 'bank', slot };
  normalisiereBank(s);
  return true;
}

export function reroll(s, pool, rng) {
  if (s.gold < REROLL_KOSTEN) return false;
  s.gold -= REROLL_KOSTEN;
  neuerLaden(s, pool, rng);
  return true;
}

/** Legt einen frischen Laden aus und gibt nicht gekaufte Einheiten zurück in den Pool. */
export function neuerLaden(s, pool, rng) {
  for (const defId of s.laden) if (defId) pool.zurueck(defId, 1);
  s.laden = wuerfleLaden(pool, s.stufe, rng);
}

export function xpKaufen(s) {
  if (s.gold < XP_KOSTEN || s.stufe >= MAX_STUFE) return false;
  s.gold -= XP_KOSTEN;
  gibXp(s, XP_PRO_KAUF);
  return true;
}

export function gibXp(s, menge) {
  if (s.stufe >= MAX_STUFE) return;
  s.xp += menge;
  let schwelle = xpFuerNaechsteStufe(s.stufe);
  while (schwelle !== null && s.xp >= schwelle) {
    s.xp -= schwelle;
    s.stufe++;
    schwelle = xpFuerNaechsteStufe(s.stufe);
  }
  if (s.stufe >= MAX_STUFE) s.xp = 0;
}

/** Rundeneinkommen: Grundgold, Zinsen, Siegesserie, Siegbonus. */
export function einkommen(s, gewonnen) {
  const grund = 5;
  const zinsen = Math.min(5, Math.floor(s.gold / 10));
  const serie = serienBonus(s.streak);
  const sieg = gewonnen ? 1 : 0;
  const summe = grund + zinsen + serie + sieg;
  s.gold += summe;
  return { grund, zinsen, serie, sieg, summe };
}

export function serienBonus(streak) {
  const n = Math.abs(streak);
  if (n >= 6) return 3;
  if (n >= 4) return 2;
  if (n >= 2) return 1;
  return 0;
}

/** Aufstellung für die Kampfsimulation. */
export function aufstellung(s) {
  return brettEinheiten(s).map((e) => ({ defId: e.defId, stern: e.stern, x: e.feld.x, y: e.feld.y }));
}

/** Entfernt überzählige Einheiten vom Brett (z. B. nach einem Stufenverlust). */
export function begrenzeBrett(s) {
  const brett = brettEinheiten(s);
  while (brett.length > maxEinheiten(s)) {
    const e = brett.pop();
    const slot = freierBankplatz(s);
    if (slot === -1) break;
    e.feld = { typ: 'bank', slot };
  }
}
