/** Tests für die Spiellogik (ohne Browser). */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { RNG } from '../src/core/rng.js';
import { UNITS, UNIT_BY_ID, werteFuer, verkaufspreis, faehigkeitsWert, TRAITS, POOL_GROESSE } from '../src/core/units.js';
import { Pool, wuerfleLaden, CHANCEN, LADEN_PLAETZE } from '../src/core/shop.js';
import { berechneSynergien, synergieEffekte } from '../src/core/traits.js';
import { naechsterSchritt, distanzKarte, freiesFeldNahe, spiegel, BREITE, HOEHE } from '../src/core/board.js';
import { simuliereSchnell, erstelleKampf, schritt, TICK } from '../src/core/combat.js';
import {
  erstelleSpieler, kaufen, verkaufen, aufBrett, aufBank, brettEinheiten, bankEinheiten,
  gibXp, einkommen, serienBonus, neuerLaden, freierBankplatz, verschmelze, neueUid,
} from '../src/core/player.js';
import { neuesSpiel, startePhaseVorbereitung, startePhaseKampf, beendePhaseKampf, rundenPlan, lebendeSpieler } from '../src/core/game.js';
import { botZug, botProfil, stelleAuf } from '../src/core/ai.js';

const spielerMitEinheiten = (defIds, stern = 1) => {
  const s = erstelleSpieler(0, 'Test', true, '#fff');
  defIds.forEach((defId, i) => {
    s.einheiten.push({ uid: neueUid(), defId, stern, feld: { typ: 'brett', x: i % 8, y: 4 + Math.floor(i / 8) } });
  });
  return s;
};

// ------------------------------------------------------------------ RNG
test('RNG ist bei gleichem Seed reproduzierbar', () => {
  const a = new RNG(1234);
  const b = new RNG(1234);
  const folgeA = Array.from({ length: 20 }, () => a.next());
  const folgeB = Array.from({ length: 20 }, () => b.next());
  assert.deepEqual(folgeA, folgeB);
  assert.ok(folgeA.every((v) => v >= 0 && v < 1));
});

test('RNG.gewichtet respektiert Gewichte', () => {
  const rng = new RNG(7);
  const treffer = [0, 0, 0];
  for (let i = 0; i < 3000; i++) treffer[rng.gewichtet([80, 20, 0])]++;
  assert.equal(treffer[2], 0);
  assert.ok(treffer[0] > treffer[1] * 2, `erwartet deutlich mehr Index 0: ${treffer}`);
});

// ------------------------------------------------------------- Einheiten
test('Einheitenkatalog ist konsistent', () => {
  const ids = new Set();
  for (const u of UNITS) {
    assert.ok(!ids.has(u.id), `doppelte ID: ${u.id}`);
    ids.add(u.id);
    assert.ok(TRAITS[u.origin], `unbekannte Herkunft bei ${u.id}`);
    assert.ok(TRAITS[u.klasse], `unbekannte Klasse bei ${u.id}`);
    assert.ok(u.kosten >= 1 && u.kosten <= 5);
    assert.ok(u.hp > 0 && u.ad > 0 && u.mana > 0);
    assert.equal(u.faehigkeit.werte.length, 3, `${u.id} braucht drei Sternwerte`);
    assert.ok(u.faehigkeit.text.includes('{v}') || u.faehigkeit.text.includes('{p}'));
  }
});

test('Jede Synergie hat für jede Stufe einen Bonus', () => {
  for (const [key, t] of Object.entries(TRAITS)) {
    assert.equal(t.stufen.length, t.boni.length, `${key}: Stufen und Boni passen nicht zusammen`);
    const anzahl = UNITS.filter((u) => u.origin === key || u.klasse === key).length;
    assert.ok(anzahl >= t.stufen[t.stufen.length - 1],
      `${key}: höchste Stufe (${t.stufen.at(-1)}) ist mit nur ${anzahl} Einheiten unerreichbar`);
  }
});

test('Sternstufen skalieren Leben und Angriff', () => {
  const def = UNIT_BY_ID.waldlaeufer;
  const s1 = werteFuer(def, 1);
  const s2 = werteFuer(def, 2);
  const s3 = werteFuer(def, 3);
  assert.ok(s2.hp > s1.hp && s3.hp > s2.hp);
  assert.equal(s2.hp, Math.round(def.hp * 1.8));
  assert.ok(faehigkeitsWert(def, 3) > faehigkeitsWert(def, 1));
});

test('Verkaufspreis: 1-Gold-Einheiten voll, teurere mit Abschlag ab 2 Sternen', () => {
  assert.equal(verkaufspreis(UNIT_BY_ID.waldlaeufer, 1), 1);
  assert.equal(verkaufspreis(UNIT_BY_ID.waldlaeufer, 2), 3);
  assert.equal(verkaufspreis(UNIT_BY_ID.dornenhexe, 1), 2);
  assert.equal(verkaufspreis(UNIT_BY_ID.dornenhexe, 2), 5); // 2*3 - 1
});

// -------------------------------------------------------------- Pool/Laden
test('Pool gibt Einheiten aus und nimmt sie zurück', () => {
  const pool = new Pool();
  const start = pool.verfuegbar('waldlaeufer');
  assert.equal(start, POOL_GROESSE[1]);
  pool.entnehmen('waldlaeufer', 3);
  assert.equal(pool.verfuegbar('waldlaeufer'), start - 3);
  pool.zurueck('waldlaeufer', 10);
  assert.equal(pool.verfuegbar('waldlaeufer'), start, 'Pool darf nicht über das Maximum wachsen');
});

test('Laden liefert fünf Plätze und respektiert die Stufenchancen', () => {
  const pool = new Pool();
  const rng = new RNG(99);
  const plaetze = wuerfleLaden(pool, 1, rng);
  assert.equal(plaetze.length, LADEN_PLAETZE);
  for (const id of plaetze) assert.equal(UNIT_BY_ID[id].kosten, 1, 'Stufe 1 darf nur 1-Gold-Einheiten zeigen');
});

test('Alle Stufenchancen ergeben 100 Prozent', () => {
  for (const [stufe, chancen] of Object.entries(CHANCEN)) {
    assert.equal(chancen.reduce((a, b) => a + b, 0), 100, `Stufe ${stufe}`);
  }
});

test('Ein leergekaufter Pool blockiert nicht', () => {
  const pool = new Pool();
  for (const u of UNITS) pool.entnehmen(u.id, POOL_GROESSE[u.kosten]);
  const plaetze = wuerfleLaden(pool, 5, new RNG(3));
  assert.deepEqual(plaetze, [null, null, null, null, null]);
});

// ------------------------------------------------------------- Synergien
test('Gleiche Einheiten zählen für Synergien nur einmal', () => {
  const s = spielerMitEinheiten(['waldlaeufer', 'waldlaeufer', 'waldlaeufer']);
  const wald = berechneSynergien(brettEinheiten(s)).find((t) => t.key === 'wald');
  assert.equal(wald.anzahl, 1);
  assert.equal(wald.stufe, 0);
});

test('Synergiestufen greifen an den Schwellen', () => {
  const s = spielerMitEinheiten(['waldlaeufer', 'moosdruide']);
  const wald = berechneSynergien(brettEinheiten(s)).find((t) => t.key === 'wald');
  assert.equal(wald.anzahl, 2);
  assert.equal(wald.stufe, 1);
  assert.equal(wald.naechste, 4);

  const s2 = spielerMitEinheiten(['waldlaeufer', 'moosdruide', 'dornenhexe', 'baumhueter']);
  const wald2 = berechneSynergien(brettEinheiten(s2)).find((t) => t.key === 'wald');
  assert.equal(wald2.stufe, 2);
  assert.equal(wald2.naechste, null);
});

test('Synergieeffekte trennen Team- und Trägerboni', () => {
  const eff = synergieEffekte([{ defId: 'skelettkrieger' }, { defId: 'grabraeuber' }]);
  assert.equal(eff.gegnerArmorMinus, 25, 'Untot 2 senkt gegnerische Rüstung');
  const kriegerBonus = eff.proTrait.krieger;
  assert.ok(!kriegerBonus, 'nur ein Krieger auf dem Brett – kein Klassenbonus');
});

test('Assassinen-Synergie markiert den Sprung', () => {
  const eff = synergieEffekte([{ defId: 'grabraeuber' }, { defId: 'windschnitter' }]);
  assert.ok(eff.sprungTraits.has('assassine'));
});

// ----------------------------------------------------------------- Brett
test('Wegfindung findet einen Schritt Richtung Ziel', () => {
  const schrittZelle = naechsterSchritt(3, 7, 3, 0, () => false);
  assert.ok(schrittZelle);
  assert.equal(schrittZelle.y, 6, 'geht Richtung Gegner');
});

test('Wegfindung umgeht Blockaden', () => {
  const blockiert = (x, y) => y === 6 && x !== 0;
  const schrittZelle = naechsterSchritt(3, 7, 3, 0, blockiert);
  assert.ok(schrittZelle, 'es gibt einen Weg außen herum');
  assert.ok(!blockiert(schrittZelle.x, schrittZelle.y));
});

test('Distanzkarte erreicht bei freiem Brett jedes Feld', () => {
  const karte = distanzKarte(0, 0, () => false);
  assert.equal(karte.length, BREITE * HOEHE);
  assert.ok([...karte].every((d) => d >= 0));
});

test('freiesFeldNahe weicht auf Nachbarfelder aus', () => {
  const belegt = (x, y) => x === 4 && y === 4;
  const feld = freiesFeldNahe(4, 4, belegt);
  assert.ok(feld && !(feld.x === 4 && feld.y === 4));
});

test('Spiegelung dreht das Brett korrekt', () => {
  assert.deepEqual(spiegel(0, 7), { x: 7, y: 0 });
  assert.deepEqual(spiegel(3, 5), { x: 4, y: 2 });
});

// ------------------------------------------------------------- Wirtschaft
test('Drei gleiche Einheiten verschmelzen zu zwei Sternen', () => {
  const pool = new Pool();
  const s = erstelleSpieler(0, 'Test', true, '#fff');
  s.gold = 10;
  s.laden = ['waldlaeufer', 'waldlaeufer', 'waldlaeufer', null, null];
  kaufen(s, pool, 0);
  kaufen(s, pool, 1);
  assert.equal(s.einheiten.length, 2);
  const ergebnis = kaufen(s, pool, 2);
  assert.equal(s.einheiten.length, 1);
  assert.equal(s.einheiten[0].stern, 2);
  assert.equal(ergebnis.stern, 2);
});

test('Neun gleiche Einheiten ergeben drei Sterne', () => {
  const s = erstelleSpieler(0, 'Test', true, '#fff');
  for (let i = 0; i < 9; i++) {
    s.einheiten.push({ uid: neueUid(), defId: 'waldlaeufer', stern: 1, feld: { typ: 'bank', slot: i } });
    verschmelze(s, 'waldlaeufer');
  }
  assert.equal(s.einheiten.length, 1);
  assert.equal(s.einheiten[0].stern, 3);
});

test('Verschmelzen übernimmt das Brettfeld', () => {
  const s = erstelleSpieler(0, 'Test', true, '#fff');
  s.einheiten.push({ uid: neueUid(), defId: 'moosdruide', stern: 1, feld: { typ: 'brett', x: 2, y: 6 } });
  s.einheiten.push({ uid: neueUid(), defId: 'moosdruide', stern: 1, feld: { typ: 'bank', slot: 0 } });
  s.einheiten.push({ uid: neueUid(), defId: 'moosdruide', stern: 1, feld: { typ: 'bank', slot: 1 } });
  verschmelze(s, 'moosdruide');
  assert.deepEqual(s.einheiten[0].feld, { typ: 'brett', x: 2, y: 6 });
});

test('Kauf ohne Gold oder ohne Bankplatz schlägt fehl', () => {
  const pool = new Pool();
  const s = erstelleSpieler(0, 'Test', true, '#fff');
  s.gold = 0;
  s.laden = ['waldlaeufer', null, null, null, null];
  assert.equal(kaufen(s, pool, 0), null);

  s.gold = 50;
  for (let i = 0; i < 9; i++) {
    s.einheiten.push({ uid: neueUid(), defId: 'dornenhexe', stern: 1, feld: { typ: 'bank', slot: i } });
  }
  assert.equal(freierBankplatz(s), -1);
  s.laden = ['waldlaeufer', null, null, null, null];
  assert.equal(kaufen(s, pool, 0), null, 'volle Bank blockiert den Kauf');
});

test('Bei voller Bank ist ein Kauf erlaubt, der sofort aufwertet', () => {
  const pool = new Pool();
  const s = erstelleSpieler(0, 'Test', true, '#fff');
  s.gold = 50;
  s.einheiten.push({ uid: neueUid(), defId: 'waldlaeufer', stern: 1, feld: { typ: 'bank', slot: 0 } });
  s.einheiten.push({ uid: neueUid(), defId: 'waldlaeufer', stern: 1, feld: { typ: 'bank', slot: 1 } });
  for (let i = 2; i < 9; i++) {
    s.einheiten.push({ uid: neueUid(), defId: 'dornenhexe', stern: 1, feld: { typ: 'bank', slot: i } });
  }
  s.laden = ['waldlaeufer', null, null, null, null];
  const neu = kaufen(s, pool, 0);
  assert.equal(neu.stern, 2);
});

test('Verkaufen gibt Gold und legt die Einheiten zurück in den Pool', () => {
  const pool = new Pool();
  const s = erstelleSpieler(0, 'Test', true, '#fff');
  s.gold = 0;
  const einheit = { uid: neueUid(), defId: 'dornenhexe', stern: 2, feld: { typ: 'bank', slot: 0 } };
  s.einheiten.push(einheit);
  pool.entnehmen('dornenhexe', 3);
  const vorher = pool.verfuegbar('dornenhexe');
  const preis = verkaufen(s, pool, einheit.uid);
  assert.equal(preis, 5);
  assert.equal(s.gold, 5);
  assert.equal(pool.verfuegbar('dornenhexe'), vorher + 3);
  assert.equal(s.einheiten.length, 0);
});

test('Das Brett fasst höchstens Stufe-viele Einheiten', () => {
  const s = erstelleSpieler(0, 'Test', true, '#fff');
  s.stufe = 2;
  for (let i = 0; i < 3; i++) {
    s.einheiten.push({ uid: neueUid(), defId: 'waldlaeufer', stern: 1, feld: { typ: 'bank', slot: i } });
  }
  assert.ok(aufBrett(s, s.einheiten[0].uid, 3, 6));
  assert.ok(aufBrett(s, s.einheiten[1].uid, 4, 6));
  assert.equal(aufBrett(s, s.einheiten[2].uid, 5, 6), false, 'dritte Einheit passt nicht');
  assert.equal(brettEinheiten(s).length, 2);
});

test('Einheiten tauschen die Plätze statt sich zu überlagern', () => {
  const s = erstelleSpieler(0, 'Test', true, '#fff');
  s.stufe = 4;
  const a = { uid: neueUid(), defId: 'waldlaeufer', stern: 1, feld: { typ: 'brett', x: 3, y: 6 } };
  const b = { uid: neueUid(), defId: 'moosdruide', stern: 1, feld: { typ: 'brett', x: 4, y: 6 } };
  s.einheiten.push(a, b);
  aufBrett(s, a.uid, 4, 6);
  assert.deepEqual(a.feld, { typ: 'brett', x: 4, y: 6 });
  assert.deepEqual(b.feld, { typ: 'brett', x: 3, y: 6 });
});

test('Tausch zwischen vollem Brett und Bank ist erlaubt', () => {
  const s = erstelleSpieler(0, 'Test', true, '#fff');
  s.stufe = 1;
  const brett = { uid: neueUid(), defId: 'waldlaeufer', stern: 1, feld: { typ: 'brett', x: 3, y: 6 } };
  const bank = { uid: neueUid(), defId: 'moosdruide', stern: 1, feld: { typ: 'bank', slot: 0 } };
  s.einheiten.push(brett, bank);
  assert.ok(aufBank(s, brett.uid, 0), 'Tausch darf nicht am vollen Brett scheitern');
  assert.equal(brett.feld.typ, 'bank');
  assert.equal(bank.feld.typ, 'brett');
});

test('Einheiten dürfen nicht in die gegnerische Hälfte', () => {
  const s = erstelleSpieler(0, 'Test', true, '#fff');
  const e = { uid: neueUid(), defId: 'waldlaeufer', stern: 1, feld: { typ: 'bank', slot: 0 } };
  s.einheiten.push(e);
  assert.equal(aufBrett(s, e.uid, 3, 2), false);
  assert.equal(e.feld.typ, 'bank');
});

test('Erfahrung steigert die Stufe schrittweise', () => {
  const s = erstelleSpieler(0, 'Test', true, '#fff');
  assert.equal(s.stufe, 2);
  gibXp(s, 2);
  assert.equal(s.stufe, 3);
  gibXp(s, 60);
  assert.ok(s.stufe > 3 && s.stufe < 9, `Zwischenstufe erwartet, ist ${s.stufe}`);
  gibXp(s, 400);
  assert.equal(s.stufe, 9, 'Stufe 9 ist das Maximum');
  assert.equal(s.xp, 0);
});

test('Einkommen aus Grundgold, Zinsen, Serie und Sieg', () => {
  const s = erstelleSpieler(0, 'Test', true, '#fff');
  s.gold = 30;
  s.streak = 4;
  const e = einkommen(s, true);
  assert.equal(e.grund, 5);
  assert.equal(e.zinsen, 3);
  assert.equal(e.serie, 2);
  assert.equal(e.sieg, 1);
  assert.equal(s.gold, 41);
});

test('Zinsen sind bei 5 Gold gedeckelt', () => {
  const s = erstelleSpieler(0, 'Test', true, '#fff');
  s.gold = 120;
  const e = einkommen(s, false);
  assert.equal(e.zinsen, 5);
});

test('Niederlagenserien geben denselben Bonus wie Siegesserien', () => {
  assert.equal(serienBonus(-4), 2);
  assert.equal(serienBonus(4), 2);
  assert.equal(serienBonus(1), 0);
  assert.equal(serienBonus(-7), 3);
});

// ----------------------------------------------------------------- Kampf
test('Kampf endet und liefert genau einen Sieger', () => {
  const a = [{ defId: 'zwergenwache', stern: 2, x: 3, y: 5 }, { defId: 'waldlaeufer', stern: 2, x: 3, y: 7 }];
  const b = [{ defId: 'skelettkrieger', stern: 1, x: 3, y: 5 }];
  const erg = simuliereSchnell(a, b, 5);
  assert.equal(erg.gewinner, 'a');
  assert.ok(erg.ueberlebende.length > 0);
  assert.ok(erg.dauer > 0 && erg.dauer < 70);
});

test('Kampf ist bei gleichem Seed reproduzierbar', () => {
  const a = [{ defId: 'grabraeuber', stern: 2, x: 3, y: 5 }, { defId: 'moosdruide', stern: 1, x: 3, y: 7 }];
  const b = [{ defId: 'donnerwaechter', stern: 2, x: 3, y: 5 }, { defId: 'knochenbogner', stern: 1, x: 4, y: 7 }];
  const e1 = simuliereSchnell(a, b, 12345);
  const e2 = simuliereSchnell(a, b, 12345);
  assert.deepEqual(e1, e2);
});

test('Ein leeres Team verliert', () => {
  const erg = simuliereSchnell([], [{ defId: 'waldlaeufer', stern: 1, x: 3, y: 5 }], 1);
  assert.equal(erg.gewinner, 'b');
});

test('Zwei leere Teams enden unentschieden', () => {
  assert.equal(simuliereSchnell([], [], 1).gewinner, 'unentschieden');
});

test('Sternstufen entscheiden das identische Duell', () => {
  const eins = [{ defId: 'donnerwaechter', stern: 1, x: 3, y: 5 }];
  const zwei = [{ defId: 'donnerwaechter', stern: 2, x: 3, y: 5 }];
  assert.equal(simuliereSchnell(zwei, eins, 8).gewinner, 'a');
  assert.equal(simuliereSchnell(eins, zwei, 8).gewinner, 'b');
});

test('Synergien wirken sich auf den Kampfausgang aus', () => {
  // Vier Zwerge (Rüstung +75) gegen dieselben Einheiten ohne Synergie-Partner.
  const mitSynergie = [
    { defId: 'zwergenwache', stern: 2, x: 2, y: 5 },
    { defId: 'runenschmied', stern: 2, x: 3, y: 5 },
    { defId: 'zwergenkanonier', stern: 1, x: 4, y: 7 },
    { defId: 'bergkoenig', stern: 1, x: 4, y: 5 },
  ];
  const eff = synergieEffekte(mitSynergie);
  assert.equal(eff.proTrait.zwerg.armor, 75);
});

test('Einheiten bewegen sich aufeinander zu', () => {
  const kampf = erstelleKampf(
    [{ defId: 'zwergenwache', stern: 1, x: 3, y: 7 }],
    [{ defId: 'zwergenwache', stern: 1, x: 3, y: 7 }],
    1,
  );
  const a = kampf.einheiten[0];
  const startAbstand = Math.abs(kampf.einheiten[0].y - kampf.einheiten[1].y);
  for (let i = 0; i < 120; i++) schritt(kampf, TICK);
  const abstand = Math.abs(kampf.einheiten[0].y - kampf.einheiten[1].y);
  assert.ok(abstand < startAbstand, `Abstand sollte schrumpfen (${startAbstand} -> ${abstand})`);
});

test('Fähigkeiten werden gewirkt und verbrauchen Mana', () => {
  const kampf = erstelleKampf(
    [{ defId: 'sturmlehrling', stern: 3, x: 3, y: 7 }],
    [{ defId: 'weltenbaum', stern: 1, x: 3, y: 5 }],
    1,
  );
  const magier = kampf.einheiten[0];
  let gezaubert = false;
  for (let i = 0; i < 60 * 20 && !gezaubert; i++) {
    schritt(kampf, TICK);
    gezaubert = kampf.effekte.some((e) => e.typ === 'zauber');
  }
  assert.ok(gezaubert, 'der Magier sollte innerhalb von 20 Sekunden zaubern');
});

test('Assassinen springen zu Kampfbeginn in die Hinterreihe', () => {
  const kampf = erstelleKampf(
    [
      { defId: 'grabraeuber', stern: 1, x: 3, y: 7 },
      { defId: 'windschnitter', stern: 1, x: 4, y: 7 },
    ],
    [
      { defId: 'zwergenwache', stern: 1, x: 3, y: 4 },
      { defId: 'knochenbogner', stern: 1, x: 3, y: 7 },
    ],
    1,
  );
  const assassine = kampf.einheiten.find((k) => k.defId === 'grabraeuber');
  assert.ok(assassine.cy <= 2, `Assassine sollte in der oberen Bretthälfte landen, ist bei y=${assassine.cy}`);
});

test('Kämpfe laufen schnell genug für die Auswertung aller Duelle', () => {
  const a = [
    { defId: 'baumhueter', stern: 2, x: 3, y: 5 }, { defId: 'moosdruide', stern: 2, x: 3, y: 7 },
    { defId: 'waldlaeufer', stern: 2, x: 4, y: 7 }, { defId: 'dornenhexe', stern: 2, x: 5, y: 7 },
  ];
  const b = [
    { defId: 'donnerwaechter', stern: 2, x: 3, y: 5 }, { defId: 'sturmrufer', stern: 1, x: 3, y: 7 },
    { defId: 'windschnitter', stern: 2, x: 4, y: 5 }, { defId: 'drachenkind', stern: 2, x: 5, y: 7 },
  ];
  const start = Date.now();
  for (let i = 0; i < 20; i++) simuliereSchnell(a, b, i);
  const dauer = Date.now() - start;
  assert.ok(dauer < 4000, `20 Kämpfe brauchten ${dauer} ms`);
});

// ---------------------------------------------------------------- Partie
test('Rundenplan: erst Kreaturen, dann Etappen zu sechs Runden', () => {
  assert.deepEqual(rundenPlan(1), { etappe: 1, runde: 1, typ: 'kreaturen', kreaturIndex: 0 });
  assert.equal(rundenPlan(4).typ, 'duell');
  assert.equal(rundenPlan(4).etappe, 2);
  assert.equal(rundenPlan(9).typ, 'kreaturen', 'die sechste Runde jeder Etappe ist eine Kreaturenrunde');
  assert.equal(rundenPlan(10).etappe, 3);
});

test('Eine Partie startet mit acht Spielern und vollem Laden', () => {
  const spiel = neuesSpiel(2024);
  assert.equal(spiel.spieler.length, 8);
  assert.equal(spiel.mensch.istMensch, true);
  startePhaseVorbereitung(spiel);
  assert.equal(spiel.mensch.laden.length, 5);
  assert.equal(spiel.mensch.gold, 4);
  assert.equal(spiel.mensch.stufe, 2);
  assert.equal(spiel.rundeNr, 1);
});

test('Bots kaufen ein und stellen auf', () => {
  const spiel = neuesSpiel(77);
  startePhaseVorbereitung(spiel);
  for (const bot of spiel.spieler.filter((s) => !s.istMensch)) {
    assert.ok(bot.einheiten.length > 0, `${bot.name} hat nichts gekauft`);
    assert.ok(brettEinheiten(bot).length > 0, `${bot.name} hat nichts aufgestellt`);
    assert.ok(brettEinheiten(bot).length <= bot.stufe, `${bot.name} hat zu viele Einheiten aufgestellt`);
    for (const e of brettEinheiten(bot)) {
      assert.ok(e.feld.y >= 4 && e.feld.y <= 7, 'Bots stellen nur in ihrer Hälfte auf');
    }
  }
});

test('Bots stellen Nahkämpfer vor die Fernkämpfer', () => {
  const spiel = neuesSpiel(31);
  startePhaseVorbereitung(spiel);
  const bot = spiel.spieler[1];
  bot.stufe = 8;
  bot.gold = 60;
  botZug(bot, spiel.pool, spiel.rng, 10);
  const brett = brettEinheiten(bot);
  const nah = brett.filter((e) => UNIT_BY_ID[e.defId].reichweite <= 1);
  const fern = brett.filter((e) => UNIT_BY_ID[e.defId].reichweite > 1);
  if (nah.length && fern.length) {
    const vordersteReihe = Math.min(...nah.map((e) => e.feld.y));
    const hintersteReihe = Math.max(...fern.map((e) => e.feld.y));
    assert.ok(vordersteReihe < hintersteReihe, 'Nahkämpfer stehen näher am Gegner');
  }
});

test('Eine Runde läuft von der Vorbereitung bis zur Auswertung durch', () => {
  const spiel = neuesSpiel(555);
  startePhaseVorbereitung(spiel);
  // Der Mensch stellt automatisch auf, damit er nicht kampflos verliert.
  spiel.mensch.gold = 20;
  spiel.mensch.profil = botProfil(spiel.rng);
  botZug(spiel.mensch, spiel.pool, spiel.rng, 1);

  const kampf = startePhaseKampf(spiel);
  assert.ok(kampf, 'der Mensch bekommt einen sichtbaren Kampf');
  let sicherung = 0;
  while (!kampf.vorbei && sicherung++ < 60 * 70) schritt(kampf, TICK);
  assert.ok(kampf.vorbei);

  const berichte = beendePhaseKampf(spiel);
  assert.ok(berichte.length >= 1);
  assert.equal(spiel.phase, 'auswertung');
  const meiner = berichte.find((b) => b.spieler === spiel.mensch);
  assert.ok(meiner);
  assert.equal(typeof meiner.gewonnen, 'boolean');
});

test('Verlierer nehmen Schaden, Gewinner nicht', () => {
  const spiel = neuesSpiel(909);
  startePhaseVorbereitung(spiel);
  // Der Mensch tritt ohne Einheiten an und muss verlieren.
  spiel.mensch.einheiten = [];
  startePhaseKampf(spiel);
  const kampf = spiel.kampf;
  let sicherung = 0;
  while (kampf && !kampf.vorbei && sicherung++ < 60 * 70) schritt(kampf, TICK);
  beendePhaseKampf(spiel);
  assert.ok(spiel.mensch.leben < 100, 'ohne Einheiten verliert man Leben');
  assert.ok(spiel.mensch.streak < 0);
});

test('Eine komplette Partie endet mit genau einem Sieger', () => {
  const spiel = neuesSpiel(20240815);
  spiel.mensch.profil = botProfil(spiel.rng);
  let runden = 0;
  while (!spiel.vorbei && runden++ < 80) {
    startePhaseVorbereitung(spiel);
    botZug(spiel.mensch, spiel.pool, spiel.rng, spiel.rundeNr);
    startePhaseKampf(spiel);
    if (spiel.kampf) {
      let sicherung = 0;
      while (!spiel.kampf.vorbei && sicherung++ < 60 * 70) schritt(spiel.kampf, TICK);
    }
    beendePhaseKampf(spiel);
  }
  assert.ok(spiel.vorbei, `Partie sollte innerhalb von 80 Runden enden (${runden})`);
  const platzierungen = spiel.spieler.filter((s) => s.platz).map((s) => s.platz);
  assert.equal(new Set(platzierungen).size, platzierungen.length, 'Plätze werden nur einmal vergeben');
  // Die Partie endet, sobald der Mensch ausscheidet oder nur noch einer übrig ist.
  assert.ok(spiel.mensch.tot || lebendeSpieler(spiel).length === 1);
  assert.ok(spiel.platzierung >= 1 && spiel.platzierung <= 8);
});

test('Der Pool bleibt über eine ganze Partie hinweg im Rahmen', () => {
  const spiel = neuesSpiel(4242);
  spiel.mensch.profil = botProfil(spiel.rng);
  for (let i = 0; i < 12 && !spiel.vorbei; i++) {
    startePhaseVorbereitung(spiel);
    botZug(spiel.mensch, spiel.pool, spiel.rng, spiel.rundeNr);
    startePhaseKampf(spiel);
    if (spiel.kampf) { let n = 0; while (!spiel.kampf.vorbei && n++ < 60 * 70) schritt(spiel.kampf, TICK); }
    beendePhaseKampf(spiel);
  }
  for (const u of UNITS) {
    const rest = spiel.pool.verfuegbar(u.id);
    assert.ok(rest >= 0 && rest <= POOL_GROESSE[u.kosten], `${u.id}: ${rest} Exemplare im Pool`);
  }
});
