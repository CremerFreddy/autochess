/**
 * Deterministische Kampfsimulation.
 *
 * Der Kampf läuft in festen Zeitschritten (TICK). Bei gleichem Seed und
 * gleicher Aufstellung ist das Ergebnis immer identisch – die Oberfläche
 * rendert nur den Zustand, sie beeinflusst ihn nie.
 */
import { RNG } from './rng.js';
import { BREITE, HOEHE, distanz, naechsterSchritt, freiesFeldNahe, spiegel, idx } from './board.js';
import { UNIT_BY_ID, werteFuer, faehigkeitsWert } from './units.js';
import { synergieEffekte } from './traits.js';

export const TICK = 1 / 60;
const TEMPO = 2.4;            // Felder pro Sekunde
const ANGRIFF_TOLERANZ = 0.35; // Kulanz bei der Reichweitenprüfung
const MANA_PRO_ANGRIFF = 10;
const MANA_PRO_SCHADEN = 0.045;
const MANA_MAX_PRO_TREFFER = 20;
const ZAUBER_DAUER = 0.25;
const MAX_DAUER = 45;         // danach: plötzlicher Tod
const KRIT_BASIS = 1.5;

let laufendeId = 1;

class Kaempfer {
  constructor(team, eintrag) {
    const def = UNIT_BY_ID[eintrag.defId];
    const w = werteFuer(def, eintrag.stern);
    this.id = laufendeId++;
    this.team = team;
    this.def = def;
    this.defId = def.id;
    this.stern = eintrag.stern;
    this.glyph = def.glyph;

    this.maxHp = w.hp;
    this.hp = w.hp;
    this.schild = 0;
    this.schildBis = 0;
    this.maxMana = w.mana;
    this.mana = 0;
    this.ad = w.ad;
    this.as = w.as;
    this.reichweite = w.reichweite;
    this.armor = w.armor;
    this.mr = w.mr;
    this.crit = 0;
    this.critDmg = 0;
    this.sp = 0;
    this.regen = 0;

    this.cx = eintrag.x;
    this.cy = eintrag.y;
    this.x = eintrag.x;
    this.y = eintrag.y;
    this.zielZelle = null;

    this.zielId = null;
    this.angriffCd = 0;
    this.zauberBis = 0;
    this.stunBis = 0;
    this.wurzelBis = 0;
    this.spottZiel = null;
    this.spottBis = 0;
    this.asBuffs = [];
    this.dots = [];
    this.naechsterSchlagBonus = 0;
    this.tot = false;
    this.blick = team === 'a' ? -1 : 1;
    this.schlagAnim = 0;
    this.zauberAnim = 0;
    this.trefferAnim = 0;
    this.gesamtSchaden = 0;
  }

  get lebt() { return !this.tot; }
  get asAktuell() {
    let bonus = 0;
    for (const b of this.asBuffs) bonus += b.as;
    return this.as * (1 + bonus);
  }
}

/**
 * Startet einen Kampf.
 * @param {Array} teamA Einheiten des Spielers: {defId, stern, x, y} (untere Hälfte)
 * @param {Array} teamB Einheiten des Gegners in dessen eigenen Koordinaten
 * @param {number} seed
 */
export function erstelleKampf(teamA, teamB, seed = 1) {
  const rng = new RNG(seed);
  const einheiten = [];

  for (const e of teamA) einheiten.push(new Kaempfer('a', e));
  for (const e of teamB) {
    const p = spiegel(e.x, e.y);
    einheiten.push(new Kaempfer('b', { ...e, x: p.x, y: p.y }));
  }

  const kampf = {
    rng,
    zeit: 0,
    einheiten,
    effekte: [],
    vorbei: false,
    gewinner: null,
    ergebnis: null,
    synA: synergieEffekte(teamA),
    synB: synergieEffekte(teamB),
  };

  wendeSynergienAn(kampf);
  assassinenSprung(kampf);
  return kampf;
}

function traitKeys(k) {
  return [k.def.origin, k.def.klasse];
}

function wendeSynergienAn(kampf) {
  for (const k of kampf.einheiten) {
    const eigen = k.team === 'a' ? kampf.synA : kampf.synB;
    const fremd = k.team === 'a' ? kampf.synB : kampf.synA;
    const quellen = [eigen.global];
    for (const key of traitKeys(k)) {
      if (eigen.proTrait[key]) quellen.push(eigen.proTrait[key]);
    }
    let hpFaktor = 1;
    for (const q of quellen) {
      hpFaktor += q.hp || 0;
      k.armor += q.armor || 0;
      k.mr += q.mr || 0;
      k.as *= 1 + (q.as || 0);
      k.sp += q.sp || 0;
      k.crit += q.crit || 0;
      k.critDmg += q.critDmg || 0;
      k.regen += q.regen || 0;
      k.reichweite += q.reichweite || 0;
      k.mana = Math.min(k.maxMana, k.mana + (q.startMana || 0));
    }
    k.maxHp = Math.round(k.maxHp * hpFaktor);
    k.hp = k.maxHp;
    k.armor = Math.max(0, k.armor - (fremd.gegnerArmorMinus || 0));
  }
}

/** Assassinen springen zu Kampfbeginn in die gegnerische Hinterreihe. */
function assassinenSprung(kampf) {
  for (const k of kampf.einheiten) {
    const syn = k.team === 'a' ? kampf.synA : kampf.synB;
    const springt = traitKeys(k).some((key) => syn.sprungTraits.has(key));
    if (!springt) continue;
    const gegner = kampf.einheiten.filter((g) => g.team !== k.team && g.lebt);
    if (!gegner.length) continue;
    // Ziel: der am weitesten entfernte Gegner (die Hinterreihe).
    let fern = gegner[0];
    let fernD = -1;
    for (const g of gegner) {
      const d = distanz(k.cx, k.cy, g.cx, g.cy);
      if (d > fernD) { fernD = d; fern = g; }
    }
    const belegt = belegtPruefer(kampf, k);
    const feld = freiesFeldNahe(fern.cx, fern.cy, belegt);
    if (feld) {
      k.cx = feld.x; k.cy = feld.y;
      k.x = feld.x; k.y = feld.y;
      effekt(kampf, { typ: 'sprung', x: k.x, y: k.y, dauer: 0.4 });
    }
  }
}

function belegtPruefer(kampf, ausser) {
  const belegt = new Uint8Array(BREITE * HOEHE);
  for (const k of kampf.einheiten) {
    if (!k.lebt || k === ausser) continue;
    belegt[idx(k.cx, k.cy)] = 1;
  }
  return (x, y) => belegt[idx(x, y)] === 1;
}

function effekt(kampf, e) {
  e.start = kampf.zeit;
  e.dauer = e.dauer ?? 0.4;
  kampf.effekte.push(e);
}

// ---------------------------------------------------------------- Schaden

function schadenPhysisch(kampf, quelle, ziel, roh, krit) {
  const faktor = 100 / (100 + ziel.armor);
  let dmg = roh * faktor;
  if (krit) dmg *= KRIT_BASIS + quelle.critDmg;
  return zufuegen(kampf, quelle, ziel, dmg, krit ? 'krit' : 'physisch');
}

function schadenMagisch(kampf, quelle, ziel, roh) {
  const faktor = 100 / (100 + ziel.mr);
  return zufuegen(kampf, quelle, ziel, roh * (1 + quelle.sp) * faktor, 'magisch');
}

function zufuegen(kampf, quelle, ziel, dmg, art) {
  if (!ziel.lebt) return 0;
  dmg = Math.max(1, Math.round(dmg));
  if (ziel.schild > 0) {
    const ab = Math.min(ziel.schild, dmg);
    ziel.schild -= ab;
    dmg -= ab;
  }
  ziel.hp -= dmg;
  ziel.trefferAnim = 1;
  if (quelle) quelle.gesamtSchaden += dmg;
  ziel.mana = Math.min(ziel.maxMana, ziel.mana + Math.min(MANA_MAX_PRO_TREFFER, dmg * MANA_PRO_SCHADEN));
  effekt(kampf, { typ: 'schaden', x: ziel.x, y: ziel.y - 0.2, wert: dmg, art, dauer: 0.7 });
  if (ziel.hp <= 0) toeten(kampf, ziel);
  return dmg;
}

function heilen(kampf, ziel, menge) {
  if (!ziel.lebt) return 0;
  const vorher = ziel.hp;
  ziel.hp = Math.min(ziel.maxHp, ziel.hp + menge);
  const geheilt = Math.round(ziel.hp - vorher);
  if (geheilt > 0) effekt(kampf, { typ: 'schaden', x: ziel.x, y: ziel.y - 0.2, wert: geheilt, art: 'heilung', dauer: 0.7 });
  return geheilt;
}

function toeten(kampf, k) {
  k.tot = true;
  k.hp = 0;
  effekt(kampf, { typ: 'tod', x: k.x, y: k.y, team: k.team, glyph: k.glyph, dauer: 0.6 });
}

// ---------------------------------------------------------------- Zielwahl

function gegnerVon(kampf, k) {
  const r = [];
  for (const g of kampf.einheiten) if (g.team !== k.team && g.lebt) r.push(g);
  return r;
}

function verbuendeteVon(kampf, k) {
  const r = [];
  for (const g of kampf.einheiten) if (g.team === k.team && g.lebt) r.push(g);
  return r;
}

function naechsterGegner(kampf, k) {
  let bester = null;
  let besteD = Infinity;
  for (const g of kampf.einheiten) {
    if (g.team === k.team || !g.lebt) continue;
    const d = distanz(k.x, k.y, g.x, g.y);
    if (d < besteD - 1e-6 || (Math.abs(d - besteD) < 1e-6 && bester && g.id < bester.id)) {
      besteD = d;
      bester = g;
    }
  }
  return bester;
}

function findeZiel(kampf, k) {
  if (k.spottBis > kampf.zeit && k.spottZiel && k.spottZiel.lebt) return k.spottZiel;
  const aktuell = kampf.einheiten.find((u) => u.id === k.zielId);
  if (aktuell && aktuell.lebt && distanz(k.x, k.y, aktuell.x, aktuell.y) <= k.reichweite + 2.5) return aktuell;
  return naechsterGegner(kampf, k);
}

// ---------------------------------------------------------------- Fähigkeiten

function wirkeFaehigkeit(kampf, k, ziel) {
  const f = k.def.faehigkeit;
  const w = faehigkeitsWert(k.def, k.stern);
  const gegner = gegnerVon(kampf, k);
  effekt(kampf, { typ: 'zauber', x: k.x, y: k.y, farbe: zauberFarbe(k), name: f.name, dauer: 0.5 });
  k.zauberAnim = 1;

  switch (f.wirkung) {
    case 'durchschlag': {
      if (!ziel) break;
      schadenMagisch(kampf, k, ziel, w);
      const dahinter = gegner
        .filter((g) => g !== ziel && distanz(g.x, g.y, ziel.x, ziel.y) < 2.2 && distanz(g.x, g.y, k.x, k.y) > distanz(ziel.x, ziel.y, k.x, k.y))
        .sort((a, b) => distanz(a.x, a.y, ziel.x, ziel.y) - distanz(b.x, b.y, ziel.x, ziel.y))[0];
      if (dahinter) schadenMagisch(kampf, k, dahinter, w);
      effekt(kampf, { typ: 'strahl', x1: k.x, y1: k.y, x2: ziel.x, y2: ziel.y, farbe: '#9ad86f', dauer: 0.3 });
      break;
    }
    case 'schild': {
      k.schild += Math.round(w * (1 + k.sp));
      k.schildBis = kampf.zeit + 4;
      effekt(kampf, { typ: 'ring', x: k.x, y: k.y, farbe: '#ffd479', dauer: 0.6 });
      break;
    }
    case 'nahschaden': {
      if (!ziel) break;
      const dmg = schadenMagisch(kampf, k, ziel, w);
      heilen(kampf, k, dmg * 0.5);
      break;
    }
    case 'kette': {
      let aktuellesZiel = ziel;
      const getroffen = new Set();
      for (let i = 0; i < (f.ziele || 3) && aktuellesZiel; i++) {
        getroffen.add(aktuellesZiel.id);
        const von = i === 0 ? k : kampf.einheiten.find((u) => u.id === [...getroffen][i - 1]);
        effekt(kampf, { typ: 'strahl', x1: von.x, y1: von.y, x2: aktuellesZiel.x, y2: aktuellesZiel.y, farbe: '#8fd8ff', dauer: 0.25 });
        schadenMagisch(kampf, k, aktuellesZiel, w);
        const naechste = gegner
          .filter((g) => g.lebt && !getroffen.has(g.id))
          .sort((a, b) => distanz(a.x, a.y, aktuellesZiel.x, aktuellesZiel.y) - distanz(b.x, b.y, aktuellesZiel.x, aktuellesZiel.y))[0];
        aktuellesZiel = naechste || null;
      }
      break;
    }
    case 'heilung': {
      const verbuendete = verbuendeteVon(kampf, k);
      const schwaechster = verbuendete.sort((a, b) => (a.hp / a.maxHp) - (b.hp / b.maxHp))[0];
      if (schwaechster) {
        heilen(kampf, schwaechster, w * (1 + k.sp));
        effekt(kampf, { typ: 'strahl', x1: k.x, y1: k.y, x2: schwaechster.x, y2: schwaechster.y, farbe: '#7ef2a8', dauer: 0.4 });
        effekt(kampf, { typ: 'ring', x: schwaechster.x, y: schwaechster.y, farbe: '#7ef2a8', dauer: 0.6 });
      }
      break;
    }
    case 'flaeche': {
      const zentrum = f.radius >= 2 ? dichtesteGruppe(gegner, f.radius) : ziel;
      if (!zentrum) break;
      effekt(kampf, { typ: 'explosion', x: zentrum.x, y: zentrum.y, radius: f.radius, farbe: zauberFarbe(k), dauer: 0.5 });
      let summe = 0;
      for (const g of gegner) {
        if (distanz(g.x, g.y, zentrum.x, zentrum.y) <= f.radius) summe += schadenMagisch(kampf, k, g, w);
      }
      if (f.selbstSchild) {
        k.schild += Math.round(w * f.selbstSchild * (1 + k.sp));
        k.schildBis = kampf.zeit + 5;
      }
      break;
    }
    case 'hinrichtung': {
      if (!ziel) break;
      const faktor = ziel.hp / ziel.maxHp < 0.4 ? 2 : 1;
      schadenMagisch(kampf, k, ziel, w * faktor);
      effekt(kampf, { typ: 'ring', x: ziel.x, y: ziel.y, farbe: '#ff7a9c', dauer: 0.4 });
      break;
    }
    case 'verstaerkung': {
      const verbuendete = verbuendeteVon(kampf, k);
      const staerkster = verbuendete.filter((a) => a !== k).sort((a, b) => b.ad * b.asAktuell - a.ad * a.asAktuell)[0];
      for (const t of [k, staerkster]) {
        if (!t) continue;
        t.asBuffs.push({ as: w, bis: kampf.zeit + (f.dauer || 5) });
        effekt(kampf, { typ: 'ring', x: t.x, y: t.y, farbe: '#ffb347', dauer: 0.6 });
      }
      break;
    }
    case 'wirbel': {
      effekt(kampf, { typ: 'explosion', x: k.x, y: k.y, radius: f.radius, farbe: '#c9f2ff', dauer: 0.45 });
      for (const g of gegner) {
        if (distanz(g.x, g.y, k.x, k.y) <= f.radius) schadenMagisch(kampf, k, g, w);
      }
      break;
    }
    case 'spott': {
      k.schild += Math.round(w * (1 + k.sp));
      k.schildBis = kampf.zeit + 6;
      effekt(kampf, { typ: 'explosion', x: k.x, y: k.y, radius: 2.2, farbe: '#7ec98f', dauer: 0.5 });
      for (const g of gegner) {
        if (distanz(g.x, g.y, k.x, k.y) <= 2.2) {
          g.spottZiel = k;
          g.spottBis = kampf.zeit + (f.dauer || 3);
          g.zielId = k.id;
        }
      }
      break;
    }
    case 'gift': {
      if (!ziel) break;
      ziel.dots.push({ dps: w * (1 + k.sp), bis: kampf.zeit + (f.dauer || 4), quelle: k });
      effekt(kampf, { typ: 'strahl', x1: k.x, y1: k.y, x2: ziel.x, y2: ziel.y, farbe: '#b6f26a', dauer: 0.3 });
      effekt(kampf, { typ: 'ring', x: ziel.x, y: ziel.y, farbe: '#b6f26a', dauer: 0.5 });
      break;
    }
    case 'betaeubung': {
      effekt(kampf, { typ: 'explosion', x: k.x, y: k.y, radius: f.radius, farbe: '#6fc7ff', dauer: 0.5 });
      for (const g of gegner) {
        if (distanz(g.x, g.y, k.x, k.y) <= f.radius) {
          schadenMagisch(kampf, k, g, w);
          g.stunBis = Math.max(g.stunBis, kampf.zeit + (f.dauer || 1.5));
        }
      }
      break;
    }
    case 'kegel': {
      if (!ziel) break;
      const dx = ziel.x - k.x;
      const dy = ziel.y - k.y;
      const laenge = Math.hypot(dx, dy) || 1;
      const nx = dx / laenge;
      const ny = dy / laenge;
      const breite = f.breit ? 1.6 : 1.0;
      effekt(kampf, { typ: 'kegel', x: k.x, y: k.y, nx, ny, breite, laenge: 5, farbe: '#ff9a5c', dauer: 0.5 });
      for (const g of gegner) {
        const rx = g.x - k.x;
        const ry = g.y - k.y;
        const laengs = rx * nx + ry * ny;
        const quer = Math.abs(-rx * ny + ry * nx);
        if (laengs > -0.5 && laengs < 5.5 && quer <= breite) schadenMagisch(kampf, k, g, w);
      }
      break;
    }
    case 'lebensraub': {
      if (!ziel) break;
      const dmg = schadenMagisch(kampf, k, ziel, w);
      heilen(kampf, k, dmg);
      effekt(kampf, { typ: 'strahl', x1: ziel.x, y1: ziel.y, x2: k.x, y2: k.y, farbe: '#c88bff', dauer: 0.4 });
      break;
    }
    case 'teamheilung': {
      for (const a of verbuendeteVon(kampf, k)) heilen(kampf, a, w * (1 + k.sp));
      effekt(kampf, { typ: 'explosion', x: k.x, y: k.y, radius: 3, farbe: '#7ef2a8', dauer: 0.7 });
      for (const g of gegner) {
        if (distanz(g.x, g.y, k.x, k.y) <= 2.5) g.wurzelBis = Math.max(g.wurzelBis, kampf.zeit + (f.dauer || 3));
      }
      break;
    }
    default:
      if (ziel) schadenMagisch(kampf, k, ziel, w);
  }
}

function zauberFarbe(k) {
  const paletten = { wald: '#7ef2a8', untot: '#c88bff', zwerg: '#ffb861', sturm: '#8fd8ff', drache: '#ff9a5c' };
  return paletten[k.def.origin] || '#ffffff';
}

/** Findet das Zentrum der dichtesten Gegnergruppe (für Flächenzauber). */
function dichtesteGruppe(gegner, radius) {
  let bestes = null;
  let beste = -1;
  for (const g of gegner) {
    let n = 0;
    for (const h of gegner) if (distanz(g.x, g.y, h.x, h.y) <= radius) n++;
    if (n > beste) { beste = n; bestes = g; }
  }
  return bestes;
}

// ---------------------------------------------------------------- Tick

export function schritt(kampf, dt = TICK) {
  if (kampf.vorbei) return;
  kampf.zeit += dt;
  const t = kampf.zeit;

  // Aufräumen: abgelaufene Buffs, Schilde, Effekte
  for (const k of kampf.einheiten) {
    if (!k.lebt) continue;
    if (k.schildBis && t > k.schildBis) { k.schild = 0; k.schildBis = 0; }
    if (k.asBuffs.length) k.asBuffs = k.asBuffs.filter((b) => b.bis > t);
    if (k.regen) heilenLeise(k, k.regen * dt);
    if (k.dots.length) {
      for (const d of k.dots) if (d.bis > t) zufuegen(kampf, d.quelle, k, d.dps * dt, 'gift-tick');
      k.dots = k.dots.filter((d) => d.bis > t);
    }
    k.schlagAnim = Math.max(0, k.schlagAnim - dt * 4);
    k.zauberAnim = Math.max(0, k.zauberAnim - dt * 2.5);
    k.trefferAnim = Math.max(0, k.trefferAnim - dt * 5);
  }
  kampf.effekte = kampf.effekte.filter((e) => t - e.start < e.dauer);

  const belegt = belegtPruefer(kampf, null);

  for (const k of kampf.einheiten) {
    if (!k.lebt) continue;
    if (t < k.zauberBis) continue;
    if (t < k.stunBis) continue;

    const ziel = findeZiel(kampf, k);
    if (!ziel) continue;
    k.zielId = ziel.id;
    k.blick = Math.sign(ziel.x - k.x) || k.blick;

    const d = distanz(k.x, k.y, ziel.x, ziel.y);
    const inReichweite = d <= k.reichweite + ANGRIFF_TOLERANZ;

    if (k.mana >= k.maxMana) {
      k.mana = 0;
      k.zauberBis = t + ZAUBER_DAUER;
      wirkeFaehigkeit(kampf, k, ziel);
      continue;
    }

    if (inReichweite) {
      k.angriffCd -= dt;
      if (k.angriffCd <= 0) {
        k.angriffCd = 1 / Math.max(0.1, k.asAktuell);
        k.schlagAnim = 1;
        const krit = kampf.rng.chance(k.crit);
        const dmg = schadenPhysisch(kampf, k, ziel, k.ad + k.naechsterSchlagBonus, krit);
        k.naechsterSchlagBonus = 0;
        k.mana = Math.min(k.maxMana, k.mana + MANA_PRO_ANGRIFF);
        if (k.reichweite > 1) {
          effekt(kampf, { typ: 'geschoss', x1: k.x, y1: k.y, x2: ziel.x, y2: ziel.y, farbe: zauberFarbe(k), dauer: 0.18 });
        }
      }
    } else if (t >= k.wurzelBis) {
      bewege(kampf, k, ziel, dt, belegt);
    }
  }

  pruefeEnde(kampf);
}

function heilenLeise(k, menge) {
  k.hp = Math.min(k.maxHp, k.hp + menge);
}

function bewege(kampf, k, ziel, dt, belegt) {
  // Zielzelle erreicht? Dann neue Zelle reservieren.
  const amZiel = Math.abs(k.x - k.cx) < 1e-3 && Math.abs(k.y - k.cy) < 1e-3;
  if (amZiel) {
    const schrittZelle = naechsterSchritt(k.cx, k.cy, ziel.cx, ziel.cy, (x, y) => (x === k.cx && y === k.cy ? false : belegt(x, y)));
    if (schrittZelle) {
      k.cx = schrittZelle.x;
      k.cy = schrittZelle.y;
    } else {
      return;
    }
  }
  const dx = k.cx - k.x;
  const dy = k.cy - k.y;
  const rest = Math.hypot(dx, dy);
  const weg = TEMPO * dt;
  if (rest <= weg) {
    k.x = k.cx;
    k.y = k.cy;
  } else {
    k.x += (dx / rest) * weg;
    k.y += (dy / rest) * weg;
  }
}

function pruefeEnde(kampf) {
  const a = kampf.einheiten.filter((k) => k.team === 'a' && k.lebt);
  const b = kampf.einheiten.filter((k) => k.team === 'b' && k.lebt);

  if (kampf.zeit > MAX_DAUER) {
    // Plötzlicher Tod: beide Seiten verlieren stetig Leben.
    const schaden = (kampf.zeit - MAX_DAUER) * 0.02;
    for (const k of [...a, ...b]) {
      k.hp -= k.maxHp * schaden;
      if (k.hp <= 0) toeten(kampf, k);
    }
  }

  if (a.length && b.length) return;
  kampf.vorbei = true;
  kampf.gewinner = a.length ? 'a' : b.length ? 'b' : 'unentschieden';
  const ueberlebende = (a.length ? a : b).map((k) => ({ defId: k.defId, stern: k.stern, hp: Math.max(0, Math.round(k.hp)) }));
  kampf.ergebnis = {
    gewinner: kampf.gewinner,
    ueberlebende: a.length || b.length ? ueberlebende : [],
    dauer: kampf.zeit,
    schadenA: kampf.einheiten.filter((k) => k.team === 'a').reduce((s, k) => s + k.gesamtSchaden, 0),
    schadenB: kampf.einheiten.filter((k) => k.team === 'b').reduce((s, k) => s + k.gesamtSchaden, 0),
  };
}

/** Führt einen Kampf ohne Darstellung komplett aus (für KI-Duelle). */
export function simuliereSchnell(teamA, teamB, seed = 1) {
  if (!teamA.length && !teamB.length) {
    return { gewinner: 'unentschieden', ueberlebende: [], dauer: 0 };
  }
  const kampf = erstelleKampf(teamA, teamB, seed);
  let sicherung = 0;
  while (!kampf.vorbei && sicherung++ < 60 * 70) schritt(kampf, TICK);
  if (!kampf.vorbei) {
    kampf.vorbei = true;
    kampf.gewinner = 'unentschieden';
    kampf.ergebnis = { gewinner: 'unentschieden', ueberlebende: [], dauer: kampf.zeit };
  }
  return kampf.ergebnis;
}
