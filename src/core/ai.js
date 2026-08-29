/**
 * Gegner-KI: Wirtschaft, Einkäufe und Aufstellung der sieben Mitspieler.
 *
 * Jeder Bot hat eine Vorliebe für bestimmte Synergien und ein Können-Niveau,
 * damit sich die Bretter im Verlauf einer Partie spürbar unterscheiden.
 */
import { UNIT_BY_ID, UNITS } from './units.js';
import { TRAITS } from './units.js';
import {
  kaufen, reroll, xpKaufen, brettEinheiten, bankEinheiten, aufBrett, aufBank,
  maxEinheiten, freierBankplatz, verkaufen, findeEinheit,
} from './player.js';
import { EIGENE_REIHEN, BREITE } from './board.js';
import { MAX_STUFE } from './shop.js';

export const BOT_NAMEN = [
  'Grimm', 'Ylva', 'Torvald', 'Nyx', 'Bramble', 'Rurik', 'Sable',
  'Hadwin', 'Kessa', 'Orin', 'Vasha', 'Dagmar',
];

/** Erzeugt ein Profil: bevorzugte Synergien + Können. */
export function botProfil(rng) {
  const keys = Object.keys(TRAITS);
  const vorlieben = rng.shuffle([...keys]).slice(0, 2);
  return {
    vorlieben,
    koennen: 0.75 + rng.next() * 0.5,
    gierig: rng.chance(0.4), // levelt früh statt zu sparen
  };
}

/** Zielstufe je Runde – Bots leveln ungefähr wie ein solider Spieler. */
function zielStufe(rundeNr, profil) {
  const basis = [2, 2, 3, 4, 4, 5, 5, 6, 6, 6, 7, 7, 7, 8, 8, 8, 8, 9];
  const s = basis[Math.min(basis.length - 1, rundeNr - 1)];
  return Math.min(MAX_STUFE, s + (profil.gierig ? 1 : 0));
}

/** Bewertet, wie gut eine Einheit zum Brett des Bots passt. */
function bewerte(spieler, profil, defId) {
  const def = UNIT_BY_ID[defId];
  let wert = def.kosten * 10;
  const eigene = spieler.einheiten.filter((e) => e.defId === defId);
  const gleicheStufe1 = eigene.filter((e) => e.stern === 1).length;
  if (gleicheStufe1 === 2) wert += 120;       // vervollständigt einen Aufstieg
  else if (gleicheStufe1 === 1) wert += 35;
  if (profil.vorlieben.includes(def.origin)) wert += 25;
  if (profil.vorlieben.includes(def.klasse)) wert += 25;
  // Bereits vorhandene Synergien weiter ausbauen
  const traits = new Set();
  for (const e of spieler.einheiten) {
    const d = UNIT_BY_ID[e.defId];
    traits.add(d.origin);
    traits.add(d.klasse);
  }
  if (traits.has(def.origin)) wert += 12;
  if (traits.has(def.klasse)) wert += 12;
  return wert;
}

/** Führt die komplette Vorbereitungsphase eines Bots aus. */
export function botZug(spieler, pool, rng, rundeNr) {
  const profil = spieler.profil;
  const ziel = zielStufe(rundeNr, profil);

  // 1. Erfahrung kaufen, solange die Zielstufe nicht erreicht ist.
  let sicherung = 0;
  while (spieler.stufe < ziel && spieler.gold >= 4 + (spieler.gold > 30 ? 0 : 10) && sicherung++ < 12) {
    if (!xpKaufen(spieler)) break;
  }

  // 2. Einkaufen und ggf. neu würfeln.
  let runden = 0;
  while (runden++ < 6) {
    const gekauft = kaufeAusLaden(spieler, pool, profil);
    const brettVoll = brettEinheiten(spieler).length >= maxEinheiten(spieler);
    const willWuerfeln =
      spieler.gold > 54 ||
      (!brettVoll && spieler.gold > 12) ||
      (rundeNr > 8 && spieler.gold > 32 && rng.chance(0.4 * profil.koennen));
    if (gekauft) continue;
    if (!willWuerfeln || spieler.gold < 2) break;
    if (!reroll(spieler, pool, rng)) break;
  }

  // 3. Schwache Bank-Einheiten verkaufen, wenn kein Platz mehr ist.
  if (freierBankplatz(spieler) === -1) machePlatz(spieler, pool);

  stelleAuf(spieler);
}

/**
 * Geht den Laden durch und kauft alles, was sich lohnt.
 * Reihenfolge: Aufstiege zuerst, dann fehlende Kämpfer, dann Luxus.
 */
function kaufeAusLaden(spieler, pool, profil) {
  let gekauft = false;
  const bewertet = spieler.laden
    .map((defId, i) => ({ defId, i, wert: defId ? bewerte(spieler, profil, defId) : -1 }))
    .filter((e) => e.defId)
    .sort((a, b) => b.wert - a.wert);

  for (const eintrag of bewertet) {
    const def = UNIT_BY_ID[eintrag.defId];
    if (spieler.gold < def.kosten) continue;
    const fehlendeKaempfer = maxEinheiten(spieler) - spieler.einheiten.length;
    const vervollstaendigt = eintrag.wert >= 120;
    const luxus = spieler.gold - def.kosten >= 22 + (def.kosten >= 4 ? 0 : 8);
    const lohntSich = vervollstaendigt || fehlendeKaempfer > 0 || luxus;
    if (!lohntSich) continue;
    if (freierBankplatz(spieler) === -1) machePlatz(spieler, pool);
    if (freierBankplatz(spieler) === -1 && !vervollstaendigt) continue;
    if (kaufen(spieler, pool, eintrag.i)) gekauft = true;
  }
  return gekauft;
}

function machePlatz(spieler, pool) {
  const bank = bankEinheiten(spieler);
  if (!bank.length) return;
  const schwaechste = bank
    .filter((e) => e.stern === 1)
    .sort((a, b) => UNIT_BY_ID[a.defId].kosten - UNIT_BY_ID[b.defId].kosten)[0];
  if (schwaechste) verkaufen(spieler, pool, schwaechste.uid);
}

/** Stellt die stärksten Einheiten auf: Nahkämpfer vorn, Fernkämpfer hinten. */
export function stelleAuf(spieler) {
  const alle = [...spieler.einheiten].sort((a, b) => staerke(b) - staerke(a));
  const platz = maxEinheiten(spieler);
  const spielen = alle.slice(0, platz);
  const bank = alle.slice(platz);

  // Alles zunächst auf die Bank räumen, dann sauber neu setzen.
  for (const e of spieler.einheiten) e.feld = { typ: 'bank', slot: 99 };

  const nah = spielen.filter((e) => UNIT_BY_ID[e.defId].reichweite <= 1);
  const fern = spielen.filter((e) => UNIT_BY_ID[e.defId].reichweite > 1);
  const reihen = { nah: [4, 5], fern: [7, 6] };
  const belegt = new Set();

  const setze = (liste, reihenfolge) => {
    let i = 0;
    for (const e of liste) {
      let gesetzt = false;
      for (const y of reihenfolge) {
        for (let n = 0; n < BREITE && !gesetzt; n++) {
          const x = spaltenReihenfolge(n);
          const key = `${x},${y}`;
          if (belegt.has(key)) continue;
          belegt.add(key);
          e.feld = { typ: 'brett', x, y };
          gesetzt = true;
        }
        if (gesetzt) break;
      }
      if (!gesetzt) e.feld = { typ: 'bank', slot: 99 };
      i++;
    }
  };
  setze(nah, reihen.nah);
  setze(fern, reihen.fern);

  let slot = 0;
  for (const e of bank) e.feld = { typ: 'bank', slot: slot++ };
  for (const e of spieler.einheiten) {
    if (e.feld.typ === 'bank' && e.feld.slot === 99) e.feld = { typ: 'bank', slot: slot++ };
  }
}

/** Von der Mitte nach außen: 3,4,2,5,1,6,0,7 */
function spaltenReihenfolge(n) {
  const reihen = [3, 4, 2, 5, 1, 6, 0, 7];
  return reihen[n % BREITE];
}

function staerke(e) {
  const def = UNIT_BY_ID[e.defId];
  return def.kosten * Math.pow(3, e.stern - 1) * 10 + def.hp / 100;
}
