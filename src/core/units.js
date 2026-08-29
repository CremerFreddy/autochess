/**
 * Einheiten-Katalog, Synergien und Fähigkeiten.
 *
 * Alle Zahlen sind Basiswerte für 1 Stern. Beim Sternaufstieg skalieren
 * Leben und Angriff mit STAR_SCALE; Fähigkeiten haben eigene Werte pro Stern.
 * Dieses Modul ist reine Daten – keine DOM-, keine Zufallsabhängigkeit.
 */

export const STAR_SCALE = 1.8;

export const ORIGINS = {
  wald:   { name: 'Wald',   farbe: '#5fd08a' },
  untot:  { name: 'Untot',  farbe: '#b28bd8' },
  zwerg:  { name: 'Zwerg',  farbe: '#e0a96d' },
  sturm:  { name: 'Sturm',  farbe: '#6fc7ff' },
  drache: { name: 'Drache', farbe: '#ff8f5c' },
};

export const CLASSES = {
  krieger:   { name: 'Krieger',   farbe: '#f0c674' },
  schuetze:  { name: 'Schütze',   farbe: '#9ad86f' },
  magier:    { name: 'Magier',    farbe: '#8fa8ff' },
  assassine: { name: 'Assassine', farbe: '#ff7a9c' },
};

/**
 * Synergien. `stufen` sind aufsteigende Schwellen; `effekt(n, stufe)` liefert
 * die Beschreibung, die konkrete Wirkung steckt in `bonus`.
 *
 * bonus-Felder:
 *   armor, mr, hp, ad, as, sp   – additive bzw. multiplikative Boni
 *   ziel: 'alle' | 'eigene'     – wirkt auf das ganze Team oder nur auf Träger
 *   sonder                      – Sonderregel, in combat.js ausgewertet
 */
export const TRAITS = {
  wald: {
    typ: 'origin',
    name: 'Wald',
    farbe: ORIGINS.wald.farbe,
    beschreibung: 'Waldwesen regenerieren im Kampf Leben.',
    stufen: [2, 4],
    boni: [
      { ziel: 'alle', regen: 12, text: 'Alle Verbündeten regenerieren 12 Leben/Sek.' },
      { ziel: 'alle', regen: 32, text: 'Alle Verbündeten regenerieren 32 Leben/Sek.' },
    ],
  },
  untot: {
    typ: 'origin',
    name: 'Untot',
    farbe: ORIGINS.untot.farbe,
    beschreibung: 'Untote zersetzen die Rüstung der Gegner.',
    stufen: [2, 4],
    boni: [
      { ziel: 'gegner', armorMinus: 25, text: 'Gegner verlieren 25 Rüstung.' },
      { ziel: 'gegner', armorMinus: 60, text: 'Gegner verlieren 60 Rüstung.' },
    ],
  },
  zwerg: {
    typ: 'origin',
    name: 'Zwerg',
    farbe: ORIGINS.zwerg.farbe,
    beschreibung: 'Zwerge halten mehr aus als alle anderen.',
    stufen: [2, 4],
    boni: [
      { ziel: 'eigene', armor: 30, mr: 30, text: 'Zwerge: +30 Rüstung und +30 Magieresistenz.' },
      { ziel: 'eigene', armor: 75, mr: 75, text: 'Zwerge: +75 Rüstung und +75 Magieresistenz.' },
    ],
  },
  sturm: {
    typ: 'origin',
    name: 'Sturm',
    farbe: ORIGINS.sturm.farbe,
    beschreibung: 'Der Sturm treibt das ganze Heer an.',
    stufen: [2, 4],
    boni: [
      { ziel: 'alle', as: 0.15, text: 'Alle Verbündeten: +15 % Angriffstempo.' },
      { ziel: 'alle', as: 0.40, text: 'Alle Verbündeten: +40 % Angriffstempo.' },
    ],
  },
  drache: {
    typ: 'origin',
    name: 'Drache',
    farbe: ORIGINS.drache.farbe,
    beschreibung: 'Drachen erwachen mit voller Kraft.',
    stufen: [2],
    boni: [
      { ziel: 'alle', startMana: 40, sp: 0.20, text: 'Alle Verbündeten starten mit 40 Mana, Drachen: +20 % Zauberkraft.' },
    ],
  },
  krieger: {
    typ: 'klasse',
    name: 'Krieger',
    farbe: CLASSES.krieger.farbe,
    beschreibung: 'Krieger bilden die Front und halten den Schaden aus.',
    stufen: [2, 4, 6],
    boni: [
      { ziel: 'eigene', hp: 0.20, text: 'Krieger: +20 % maximales Leben.' },
      { ziel: 'eigene', hp: 0.45, text: 'Krieger: +45 % maximales Leben.' },
      { ziel: 'eigene', hp: 0.90, armor: 40, text: 'Krieger: +90 % maximales Leben und +40 Rüstung.' },
    ],
  },
  schuetze: {
    typ: 'klasse',
    name: 'Schütze',
    farbe: CLASSES.schuetze.farbe,
    beschreibung: 'Schützen feuern schneller, je mehr von ihnen kämpfen.',
    stufen: [2, 4],
    boni: [
      { ziel: 'eigene', as: 0.30, text: 'Schützen: +30 % Angriffstempo.' },
      { ziel: 'eigene', as: 0.75, reichweite: 1, text: 'Schützen: +75 % Angriffstempo und +1 Reichweite.' },
    ],
  },
  magier: {
    typ: 'klasse',
    name: 'Magier',
    farbe: CLASSES.magier.farbe,
    beschreibung: 'Magier verstärken ihre Zauber gegenseitig.',
    stufen: [2, 4, 6],
    boni: [
      { ziel: 'eigene', sp: 0.25, text: 'Magier: +25 % Zauberkraft.' },
      { ziel: 'eigene', sp: 0.60, text: 'Magier: +60 % Zauberkraft.' },
      { ziel: 'alle', sp: 1.10, text: 'Alle Verbündeten: +110 % Zauberkraft.' },
    ],
  },
  assassine: {
    typ: 'klasse',
    name: 'Assassine',
    farbe: CLASSES.assassine.farbe,
    beschreibung: 'Assassinen springen zu Kampfbeginn in die gegnerische Hinterreihe.',
    stufen: [2, 3],
    boni: [
      { ziel: 'eigene', crit: 0.20, critDmg: 0.4, sprung: true, text: 'Assassinen: +20 % kritische Chance, +40 % Kritschaden, Sprung.' },
      { ziel: 'eigene', crit: 0.45, critDmg: 0.8, sprung: true, text: 'Assassinen: +45 % kritische Chance, +80 % Kritschaden, Sprung.' },
    ],
  },
};

/**
 * Fähigkeiten. `wirkung` wird in combat.js ausgewertet.
 * `werte` ist [1-Stern, 2-Stern, 3-Stern].
 */
export const UNITS = [
  // ---------------- 1 Gold ----------------
  {
    id: 'waldlaeufer', name: 'Waldläufer', kosten: 1, glyph: '❦',
    origin: 'wald', klasse: 'schuetze',
    hp: 500, ad: 45, as: 0.75, reichweite: 3, armor: 20, mr: 20, mana: 60,
    faehigkeit: {
      name: 'Splitterpfeil', wirkung: 'durchschlag', werte: [180, 270, 480],
      text: 'Schießt einen Pfeil, der dem Ziel und der Einheit dahinter {v} Magieschaden zufügt.',
    },
  },
  {
    id: 'zwergenwache', name: 'Zwergenwache', kosten: 1, glyph: '⛨',
    origin: 'zwerg', klasse: 'krieger',
    hp: 700, ad: 50, as: 0.6, reichweite: 1, armor: 45, mr: 45, mana: 70,
    faehigkeit: {
      name: 'Schildwall', wirkung: 'schild', werte: [220, 350, 600],
      text: 'Erhält 4 Sek. lang einen Schild von {v} Punkten.',
    },
  },
  {
    id: 'skelettkrieger', name: 'Skelettkrieger', kosten: 1, glyph: '☠',
    origin: 'untot', klasse: 'krieger',
    hp: 620, ad: 55, as: 0.65, reichweite: 1, armor: 30, mr: 25, mana: 60,
    faehigkeit: {
      name: 'Knochenhieb', wirkung: 'nahschaden', werte: [150, 240, 420],
      text: 'Der nächste Schlag verursacht zusätzlich {v} Magieschaden und heilt um die Hälfte davon.',
    },
  },
  {
    id: 'sturmlehrling', name: 'Sturmlehrling', kosten: 1, glyph: '⚡',
    origin: 'sturm', klasse: 'magier',
    hp: 450, ad: 35, as: 0.7, reichweite: 3, armor: 15, mr: 20, mana: 50,
    faehigkeit: {
      name: 'Funkenkette', wirkung: 'kette', werte: [130, 200, 350], ziele: 3,
      text: 'Ein Blitz springt auf bis zu 3 Gegner über und trifft für je {v}.',
    },
  },
  {
    id: 'moosdruide', name: 'Moosdruide', kosten: 1, glyph: '✿',
    origin: 'wald', klasse: 'magier',
    hp: 520, ad: 38, as: 0.65, reichweite: 2, armor: 20, mr: 25, mana: 80,
    faehigkeit: {
      name: 'Wurzelbalsam', wirkung: 'heilung', werte: [300, 480, 850],
      text: 'Heilt den am stärksten verwundeten Verbündeten um {v}.',
    },
  },

  // ---------------- 2 Gold ----------------
  {
    id: 'dornenhexe', name: 'Dornenhexe', kosten: 2, glyph: '✾',
    origin: 'wald', klasse: 'magier',
    hp: 550, ad: 40, as: 0.65, reichweite: 3, armor: 20, mr: 20, mana: 80,
    faehigkeit: {
      name: 'Dornenfeld', wirkung: 'flaeche', werte: [220, 340, 620], radius: 1.6,
      text: 'Lässt Dornen aus dem Boden brechen: {v} Magieschaden im Umkreis des Ziels.',
    },
  },
  {
    id: 'grabraeuber', name: 'Grabräuber', kosten: 2, glyph: '⚔',
    origin: 'untot', klasse: 'assassine',
    hp: 560, ad: 65, as: 0.8, reichweite: 1, armor: 25, mr: 25, mana: 45,
    faehigkeit: {
      name: 'Meucheln', wirkung: 'hinrichtung', werte: [200, 320, 560],
      text: 'Fügt {v} Magieschaden zu – doppelt so viel, wenn das Ziel unter 40 % Leben ist.',
    },
  },
  {
    id: 'runenschmied', name: 'Runenschmied', kosten: 2, glyph: '⚒',
    origin: 'zwerg', klasse: 'magier',
    hp: 640, ad: 45, as: 0.6, reichweite: 2, armor: 35, mr: 35, mana: 70,
    faehigkeit: {
      name: 'Runenschlag', wirkung: 'verstaerkung', werte: [0.6, 0.9, 1.5], dauer: 5,
      text: 'Verstärkt sich und den stärksten Verbündeten 5 Sek. um {p} % Angriffstempo.',
    },
  },
  {
    id: 'windschnitter', name: 'Windschnitter', kosten: 2, glyph: '༄',
    origin: 'sturm', klasse: 'assassine',
    hp: 520, ad: 60, as: 0.9, reichweite: 1, armor: 25, mr: 25, mana: 50,
    faehigkeit: {
      name: 'Klingenwirbel', wirkung: 'wirbel', werte: [160, 250, 440], radius: 1.6,
      text: 'Wirbelt herum und trifft alle Gegner in der Nähe für {v}.',
    },
  },

  // ---------------- 3 Gold ----------------
  {
    id: 'baumhueter', name: 'Baumhüter', kosten: 3, glyph: '⧫',
    origin: 'wald', klasse: 'krieger',
    hp: 850, ad: 60, as: 0.55, reichweite: 1, armor: 50, mr: 40, mana: 90,
    faehigkeit: {
      name: 'Rindenhaut', wirkung: 'spott', werte: [400, 620, 1100], dauer: 3,
      text: 'Erhält einen Schild von {v} und zwingt nahe Gegner 3 Sek. lang, ihn anzugreifen.',
    },
  },
  {
    id: 'knochenbogner', name: 'Knochenbogner', kosten: 3, glyph: '➶',
    origin: 'untot', klasse: 'schuetze',
    hp: 560, ad: 60, as: 0.8, reichweite: 4, armor: 20, mr: 20, mana: 60,
    faehigkeit: {
      name: 'Seuchenpfeil', wirkung: 'gift', werte: [90, 140, 250], dauer: 4,
      text: 'Vergiftet das Ziel: {v} Magieschaden pro Sekunde für 4 Sek.',
    },
  },
  {
    id: 'donnerwaechter', name: 'Donnerwächter', kosten: 3, glyph: '⛈',
    origin: 'sturm', klasse: 'krieger',
    hp: 800, ad: 65, as: 0.6, reichweite: 1, armor: 45, mr: 45, mana: 80,
    faehigkeit: {
      name: 'Donnerschlag', wirkung: 'betaeubung', werte: [230, 360, 640], dauer: 1.5, radius: 1.6,
      text: 'Schlägt den Boden: {v} Magieschaden im Umkreis, Gegner werden 1,5 Sek. betäubt.',
    },
  },
  {
    id: 'drachenkind', name: 'Drachenkind', kosten: 3, glyph: '🜂',
    origin: 'drache', klasse: 'schuetze',
    hp: 620, ad: 62, as: 0.75, reichweite: 3, armor: 25, mr: 25, mana: 60,
    faehigkeit: {
      name: 'Flammenstoß', wirkung: 'kegel', werte: [250, 390, 700],
      text: 'Speit Feuer in einer Linie: {v} Magieschaden an allen getroffenen Gegnern.',
    },
  },

  // ---------------- 4 Gold ----------------
  {
    id: 'zwergenkanonier', name: 'Zwergenkanonier', kosten: 4, glyph: '☄',
    origin: 'zwerg', klasse: 'schuetze',
    hp: 700, ad: 70, as: 0.7, reichweite: 4, armor: 35, mr: 35, mana: 80,
    faehigkeit: {
      name: 'Mörserschlag', wirkung: 'flaeche', werte: [400, 620, 1150], radius: 2.0,
      text: 'Feuert eine Granate auf die dichteste Gegnergruppe: {v} Magieschaden im Umkreis.',
    },
  },
  {
    id: 'schattenfuerst', name: 'Schattenfürst', kosten: 4, glyph: '☾',
    origin: 'untot', klasse: 'assassine',
    hp: 700, ad: 85, as: 0.85, reichweite: 1, armor: 35, mr: 35, mana: 55,
    faehigkeit: {
      name: 'Seelenraub', wirkung: 'lebensraub', werte: [340, 530, 950],
      text: 'Reißt dem Ziel {v} Leben heraus und heilt sich um denselben Betrag.',
    },
  },
  {
    id: 'bergkoenig', name: 'Bergkönig', kosten: 4, glyph: '♛',
    origin: 'zwerg', klasse: 'krieger',
    hp: 950, ad: 75, as: 0.6, reichweite: 1, armor: 55, mr: 50, mana: 90,
    faehigkeit: {
      name: 'Bergsturz', wirkung: 'flaeche', werte: [300, 470, 850], radius: 1.6, selbstSchild: 0.5,
      text: 'Stampft auf: {v} Magieschaden im Umkreis, halber Betrag als Schild für ihn selbst.',
    },
  },
  {
    id: 'sturmrufer', name: 'Sturmrufer', kosten: 4, glyph: '❈',
    origin: 'sturm', klasse: 'magier',
    hp: 620, ad: 50, as: 0.7, reichweite: 3, armor: 25, mr: 30, mana: 100,
    faehigkeit: {
      name: 'Gewitterfront', wirkung: 'kette', werte: [280, 430, 780], ziele: 5,
      text: 'Ruft ein Gewitter: Ein Blitz springt auf 5 Gegner über und trifft für je {v}.',
    },
  },

  // ---------------- 5 Gold ----------------
  {
    id: 'uralterdrache', name: 'Uralter Drache', kosten: 5, glyph: '🜍',
    origin: 'drache', klasse: 'magier',
    hp: 900, ad: 80, as: 0.7, reichweite: 3, armor: 40, mr: 40, mana: 110,
    faehigkeit: {
      name: 'Drachenatem', wirkung: 'kegel', werte: [600, 900, 2000], breit: true,
      text: 'Verbrennt alles vor sich: {v} Magieschaden in einer breiten Bahn.',
    },
  },
  {
    id: 'weltenbaum', name: 'Weltenbaum', kosten: 5, glyph: '⩕',
    origin: 'wald', klasse: 'krieger',
    hp: 1200, ad: 70, as: 0.5, reichweite: 1, armor: 60, mr: 60, mana: 120,
    faehigkeit: {
      name: 'Ewige Wurzeln', wirkung: 'teamheilung', werte: [280, 430, 780], dauer: 3,
      text: 'Heilt alle Verbündeten um {v} und wurzelt nahe Gegner 3 Sek. fest.',
    },
  },
];

/** Nachschlagetabelle id -> Definition. */
export const UNIT_BY_ID = Object.fromEntries(UNITS.map((u) => [u.id, u]));

/** Wie viele Exemplare jeder Kostenstufe im gemeinsamen Pool liegen. */
export const POOL_GROESSE = { 1: 22, 2: 18, 3: 14, 4: 10, 5: 6 };

/** Skalierte Kampfwerte einer Einheit auf gegebener Sternstufe. */
export function werteFuer(def, stern) {
  const f = Math.pow(STAR_SCALE, stern - 1);
  return {
    hp: Math.round(def.hp * f),
    ad: Math.round(def.ad * f),
    as: def.as,
    reichweite: def.reichweite,
    armor: def.armor,
    mr: def.mr,
    mana: def.mana,
  };
}

/** Fähigkeitswert auf gegebener Sternstufe (1-basiert). */
export function faehigkeitsWert(def, stern) {
  const w = def.faehigkeit.werte;
  return w[Math.min(stern, w.length) - 1];
}

/** Verkaufspreis: 1-Kosten-Einheiten immer voll, sonst 1 Gold Abschlag ab 2 Sternen. */
export function verkaufspreis(def, stern) {
  const anzahl = Math.pow(3, stern - 1);
  if (def.kosten === 1) return def.kosten * anzahl;
  return def.kosten * anzahl - (stern > 1 ? 1 : 0);
}

/** Beschreibungstext mit eingesetztem Zahlenwert. */
export function faehigkeitsText(def, stern) {
  const v = faehigkeitsWert(def, stern);
  return def.faehigkeit.text
    .replace('{v}', String(Math.round(v)))
    .replace('{p}', String(Math.round(v * 100)));
}
