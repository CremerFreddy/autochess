/**
 * Partie-Ablauf: acht Spieler, Runden, Paarungen, Wirtschaft, Ausscheiden.
 *
 * Der Ablauf einer Runde:
 *   Vorbereitung  -> Kampf -> Auswertung -> nächste Vorbereitung
 * Der Kampf des Menschen läuft sichtbar ab, die übrigen Duelle werden
 * mit derselben Simulation sofort ausgerechnet.
 */
import { RNG } from './rng.js';
import { Pool } from './shop.js';
import {
  erstelleSpieler, neuerLaden, einkommen, gibXp, aufstellung, brettEinheiten,
  begrenzeBrett, serienBonus,
} from './player.js';
import { botZug, botProfil, BOT_NAMEN, stelleAuf } from './ai.js';
import { simuliereSchnell, erstelleKampf } from './combat.js';
import { aktiveSynergien } from './traits.js';

export const SPIELER_ANZAHL = 8;
export const VORBEREITUNG_SEK = 30;

export const SPIELER_FARBEN = [
  '#6fc7ff', '#ff8f5c', '#5fd08a', '#c88bff',
  '#f2d06b', '#ff7a9c', '#7ee8e8', '#b0b8c4',
];

/** Monsterwellen. Index = wievielte Kreaturenrunde. */
const KREATUREN = [
  { name: 'Waldwölfe',      gold: 2, einheiten: [['waldlaeufer', 1, 3, 5], ['waldlaeufer', 1, 4, 5]] },
  { name: 'Grabgesindel',   gold: 2, einheiten: [['skelettkrieger', 1, 3, 5], ['skelettkrieger', 1, 4, 5], ['grabraeuber', 1, 3, 6]] },
  { name: 'Steinwächter',   gold: 3, einheiten: [['zwergenwache', 2, 3, 5], ['zwergenwache', 1, 4, 5], ['runenschmied', 1, 4, 6]] },
  { name: 'Sturmelementare', gold: 3, einheiten: [['donnerwaechter', 2, 3, 5], ['sturmlehrling', 2, 3, 7], ['windschnitter', 2, 4, 5]] },
  { name: 'Knochenhorde',   gold: 4, einheiten: [['knochenbogner', 2, 3, 7], ['skelettkrieger', 3, 3, 5], ['schattenfuerst', 2, 4, 5], ['grabraeuber', 2, 5, 5]] },
  { name: 'Bergtroll',      gold: 4, einheiten: [['bergkoenig', 3, 3, 5], ['zwergenkanonier', 2, 3, 7], ['baumhueter', 2, 4, 5]] },
  { name: 'Drachenbrut',    gold: 5, einheiten: [['uralterdrache', 2, 3, 6], ['drachenkind', 3, 4, 7], ['drachenkind', 2, 2, 7], ['weltenbaum', 2, 3, 4]] },
];

/** Baut den Rundenplan: Runde 1-3 Kreaturen, danach je 6 Runden pro Etappe. */
export function rundenPlan(nr) {
  if (nr <= 3) return { etappe: 1, runde: nr, typ: 'kreaturen', kreaturIndex: nr - 1 };
  const n = nr - 4;
  const etappe = 2 + Math.floor(n / 6);
  const runde = (n % 6) + 1;
  if (runde === 6) {
    return { etappe, runde, typ: 'kreaturen', kreaturIndex: Math.min(KREATUREN.length - 1, 2 + Math.floor(n / 6)) };
  }
  return { etappe, runde, typ: 'duell' };
}

export function kreaturTeam(index) {
  const k = KREATUREN[Math.min(index, KREATUREN.length - 1)];
  return {
    name: k.name,
    gold: k.gold,
    einheiten: k.einheiten.map(([defId, stern, x, y]) => ({ defId, stern, x, y })),
  };
}

export function neuesSpiel(seed = Date.now(), spielerName = 'Du') {
  const rng = new RNG(seed);
  const pool = new Pool();
  const spieler = [];

  const mensch = erstelleSpieler(0, spielerName, true, SPIELER_FARBEN[0]);
  spieler.push(mensch);

  const namen = rng.shuffle([...BOT_NAMEN]).slice(0, SPIELER_ANZAHL - 1);
  for (let i = 1; i < SPIELER_ANZAHL; i++) {
    const bot = erstelleSpieler(i, namen[i - 1], false, SPIELER_FARBEN[i]);
    bot.profil = botProfil(rng);
    spieler.push(bot);
  }

  const spiel = {
    seed,
    rng,
    pool,
    spieler,
    mensch,
    rundeNr: 0,
    plan: null,
    phase: 'start',
    zeitLimit: VORBEREITUNG_SEK,
    restZeit: VORBEREITUNG_SEK,
    paarungen: [],
    menschDuell: null,
    kampf: null,
    ergebnisse: [],
    log: [],
    vorbei: false,
    platzierung: null,
  };
  return spiel;
}

export const lebendeSpieler = (spiel) => spiel.spieler.filter((s) => !s.tot);

export function notiz(spiel, text) {
  spiel.log.unshift({ runde: spiel.rundeNr, text });
  if (spiel.log.length > 60) spiel.log.pop();
}

/** Startet die nächste Vorbereitungsphase. */
export function startePhaseVorbereitung(spiel) {
  spiel.rundeNr++;
  spiel.plan = rundenPlan(spiel.rundeNr);
  spiel.phase = 'vorbereitung';
  spiel.restZeit = spiel.zeitLimit;
  spiel.kampf = null;
  spiel.ergebnisse = [];

  for (const s of lebendeSpieler(spiel)) {
    if (spiel.rundeNr > 1) {
      gibXp(s, 2);
      const gewonnen = s.letztesErgebnis?.gewonnen ?? false;
      s.letztesEinkommen = einkommen(s, gewonnen);
    } else {
      s.gold = 4;
      s.letztesEinkommen = null;
    }
    if (!s.gesperrt || !s.laden.length) neuerLaden(s, spiel.pool, spiel.rng);
    begrenzeBrett(s);
  }

  for (const s of lebendeSpieler(spiel)) {
    if (!s.istMensch) botZug(s, spiel.pool, spiel.rng, spiel.rundeNr);
  }

  spiel.paarungen = bildePaarungen(spiel);
  spiel.menschDuell = spiel.paarungen.find((p) => p.a === spiel.mensch || p.b === spiel.mensch) || null;
  return spiel;
}

/** Bildet die Paarungen der Runde. */
export function bildePaarungen(spiel) {
  const lebende = lebendeSpieler(spiel);
  if (spiel.plan.typ === 'kreaturen') {
    const k = kreaturTeam(spiel.plan.kreaturIndex);
    return lebende.map((s) => ({ a: s, b: null, kreaturen: k }));
  }
  const misch = spiel.rng.shuffle([...lebende]);
  const paare = [];
  while (misch.length >= 2) {
    const a = misch.pop();
    const b = misch.pop();
    paare.push({ a, b, kreaturen: null });
  }
  if (misch.length === 1) {
    const allein = misch.pop();
    const andere = lebende.filter((s) => s !== allein);
    const geist = andere.length ? spiel.rng.pick(andere) : null;
    paare.push({ a: allein, b: geist, geist: true, kreaturen: null });
  }
  return paare;
}

/**
 * Startet die Kampfphase. Der Kampf des Menschen wird als sichtbares
 * Kampfobjekt zurückgegeben, alle anderen sofort ausgewertet.
 */
export function startePhaseKampf(spiel) {
  spiel.phase = 'kampf';
  const seedBasis = spiel.seed + spiel.rundeNr * 7919;
  spiel.ergebnisse = [];

  for (let i = 0; i < spiel.paarungen.length; i++) {
    const p = spiel.paarungen[i];
    const teamA = aufstellung(p.a);
    const teamB = p.kreaturen ? p.kreaturen.einheiten : aufstellung(p.b);
    const seed = seedBasis + i * 131;

    if (p === spiel.menschDuell) {
      spiel.kampf = erstelleKampf(teamA, teamB, seed);
      spiel.kampf.gegnerName = p.kreaturen ? p.kreaturen.name : (p.b === spiel.mensch ? p.a.name : p.b.name);
      p.kampf = spiel.kampf;
    } else {
      p.ergebnis = simuliereSchnell(teamA, teamB, seed);
    }
  }
  return spiel.kampf;
}

/** Wertet die Runde aus, sobald der sichtbare Kampf beendet ist. */
export function beendePhaseKampf(spiel) {
  spiel.phase = 'auswertung';
  const berichte = [];

  for (const p of spiel.paarungen) {
    const erg = p.kampf ? p.kampf.ergebnis : p.ergebnis;
    if (!erg) continue;

    if (p.kreaturen) {
      const gewonnen = erg.gewinner === 'a';
      const bericht = verarbeite(spiel, p.a, gewonnen, erg, p.kreaturen.name, erg.gewinner === 'b' ? erg.ueberlebende : []);
      if (gewonnen) {
        p.a.gold += p.kreaturen.gold;
        bericht.beute = p.kreaturen.gold;
      }
      berichte.push(bericht);
      continue;
    }

    const aGewinnt = erg.gewinner === 'a';
    const bGewinnt = erg.gewinner === 'b';
    const ueberlebendeA = aGewinnt ? erg.ueberlebende : [];
    const ueberlebendeB = bGewinnt ? erg.ueberlebende : [];

    berichte.push(verarbeite(spiel, p.a, aGewinnt, erg, p.b ? p.b.name : '???', ueberlebendeB));
    if (p.b && !p.geist) {
      berichte.push(verarbeite(spiel, p.b, bGewinnt, erg, p.a.name, ueberlebendeA));
    }
  }

  // Ausscheiden: Wer in derselben Runde fällt, bekommt die hinteren Plätze.
  const vorher = lebendeSpieler(spiel).length;
  const gefallen = lebendeSpieler(spiel)
    .filter((s) => s.leben <= 0)
    .sort((a, b) => a.leben - b.leben); // größter Schaden zuerst = schlechtester Platz
  let platz = vorher;
  for (const s of gefallen) {
    s.tot = true;
    s.leben = 0;
    s.platz = platz--;
    notiz(spiel, `${s.name} scheidet aus (Platz ${s.platz}).`);
  }

  const lebende = lebendeSpieler(spiel);
  if (lebende.length <= 1) {
    spiel.vorbei = true;
    if (lebende.length === 1) {
      lebende[0].platz = 1;
      notiz(spiel, `${lebende[0].name} gewinnt die Partie!`);
    }
    spiel.platzierung = spiel.mensch.platz || 1;
  } else if (spiel.mensch.tot) {
    spiel.vorbei = true;
    spiel.platzierung = spiel.mensch.platz;
  }

  spiel.ergebnisse = berichte;
  return berichte;
}

function verarbeite(spiel, s, gewonnen, erg, gegnerName, ueberlebendeGegner) {
  const bericht = { spieler: s, gewonnen, gegnerName, schaden: 0, ueberlebende: ueberlebendeGegner.length };
  if (gewonnen) {
    s.streak = s.streak >= 0 ? s.streak + 1 : 1;
  } else if (erg.gewinner === 'unentschieden') {
    s.streak = 0;
    bericht.unentschieden = true;
  } else {
    s.streak = s.streak <= 0 ? s.streak - 1 : -1;
    const basis = 2 + spiel.plan.etappe;
    const durch = ueberlebendeGegner.reduce((sum, u) => sum + u.stern, 0);
    bericht.schaden = basis + durch;
    s.leben -= bericht.schaden;
    s.verlaufSchaden += bericht.schaden;
  }
  s.letztesErgebnis = { gewonnen, schaden: bericht.schaden, gegnerName };
  return bericht;
}

/** Kompakte Übersicht für die Rangliste. */
export function rangliste(spiel) {
  return [...spiel.spieler]
    .sort((a, b) => {
      if (a.tot !== b.tot) return a.tot ? 1 : -1;
      if (a.tot && b.tot) return (a.platz || 9) - (b.platz || 9);
      return b.leben - a.leben;
    })
    .map((s) => ({
      spieler: s,
      leben: s.leben,
      stufe: s.stufe,
      streak: s.streak,
      serienBonus: serienBonus(s.streak),
      synergien: aktiveSynergien(brettEinheiten(s)).slice(0, 3),
      einheiten: brettEinheiten(s).length,
    }));
}

export { stelleAuf };
