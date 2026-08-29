/**
 * Einstiegspunkt: Spielschleife, Eingaben und Verdrahtung von Kern und Oberfläche.
 */
import {
  neuesSpiel, startePhaseVorbereitung, startePhaseKampf, beendePhaseKampf,
  notiz, VORBEREITUNG_SEK,
} from '../core/game.js';
import { schritt, TICK } from '../core/combat.js';
import {
  kaufen, verkaufen, reroll, xpKaufen, aufBrett, aufBank, findeEinheit,
  brettEinheiten, maxEinheiten, aufstellung,
} from '../core/player.js';
import { UNIT_BY_ID, verkaufspreis } from '../core/units.js';
import { zeichne, pixelZuZelle, pixelZuBankSlot, imVerkaufsfeld } from './renderer.js';
import {
  aktualisiereKopf, zeichneLaden, zeichneSynergien, zeichneRangliste, zeichneLog, zeichneBrettInfo,
  erstelleTooltip, einheitTooltip, zeigeOverlay, versteckeOverlay, zeigeBanner,
} from './hud.js';
import { EIGENE_REIHEN } from '../core/board.js';

const canvas = document.getElementById('brett');
const ctx = canvas.getContext('2d');
const tooltip = erstelleTooltip();

let spiel = null;
let drag = null;
let hover = null;
let hoverBank = null;
let auswahl = null;
let verkaufAktiv = false;
let tempo = 1;
let uebergang = 0;      // Sekunden bis zum nächsten Schritt nach dem Kampf
let uebergangsZiel = null;
let letzteZeit = performance.now();
let akku = 0;

// ------------------------------------------------------------ Partie

function starteNeuePartie() {
  versteckeOverlay();
  const seedParam = new URLSearchParams(location.search).get('seed');
  spiel = neuesSpiel(seedParam ? Number(seedParam) >>> 0 : Date.now() >>> 0);
  window.__runenschlacht = spiel; // Zugriff für Tests und Fehlersuche
  notiz(spiel, 'Die Runenschlacht beginnt. Viel Glück!');
  naechsteVorbereitung();
}

function naechsteVorbereitung() {
  startePhaseVorbereitung(spiel);
  drag = null;
  auswahl = null;
  uebergangsZiel = null;
  zeichneAlles();
}

function beginneKampf() {
  if (spiel.phase !== 'vorbereitung') return;
  if (brettEinheiten(spiel.mensch).length === 0) {
    zeigeBanner('Keine Einheiten aufgestellt!', 'niederlage');
    return;
  }
  drag = null;
  auswahl = null;
  tooltip.verstecke();
  startePhaseKampf(spiel);
  zeichneAlles();
}

function werteKampfAus() {
  const berichte = beendePhaseKampf(spiel);
  const meiner = berichte.find((b) => b.spieler === spiel.mensch);
  if (meiner) {
    if (meiner.unentschieden) {
      zeigeBanner('Unentschieden', '');
      notiz(spiel, `Unentschieden gegen ${meiner.gegnerName}.`);
    } else if (meiner.gewonnen) {
      zeigeBanner('Sieg', 'sieg');
      const beute = meiner.beute ? ` (+${meiner.beute} ◈ Beute)` : '';
      spiel.log.unshift({ runde: spiel.rundeNr, text: `Sieg gegen ${meiner.gegnerName}${beute}.`, art: 'sieg' });
    } else {
      zeigeBanner('Niederlage', 'niederlage');
      spiel.log.unshift({
        runde: spiel.rundeNr,
        text: `Niederlage gegen ${meiner.gegnerName}: −${meiner.schaden} Leben (${meiner.ueberlebende} überlebende Gegner).`,
        art: 'niederlage',
      });
    }
  }
  zeichneAlles();

  if (spiel.vorbei) {
    uebergangsZiel = 'ende';
    uebergang = 1.6;
  } else {
    uebergangsZiel = 'vorbereitung';
    uebergang = 2.2;
  }
}

function zeigeEndstand() {
  const s = spiel.mensch;
  const platz = s.platz || 1;
  const gewonnen = platz === 1;
  const rang = [...spiel.spieler]
    .sort((a, b) => (a.platz || (a.tot ? 9 : 0)) - (b.platz || (b.tot ? 9 : 0)))
    .map((p) => ({ links: `${p.platz ? '#' + p.platz : '—'} ${p.name}`, rechts: `${Math.max(0, p.leben)} ❤ · Stufe ${p.stufe}` }));
  zeigeOverlay({
    titel: gewonnen ? 'Sieg – Platz 1!' : `Ausgeschieden – Platz ${platz}`,
    text: gewonnen
      ? 'Du hast alle sieben Gegner überstanden und die Runenschlacht gewonnen.'
      : `Deine Armee ist gefallen. Du hast ${spiel.rundeNr} Runden durchgehalten.`,
    details: rang,
    knopfText: 'Neue Partie',
    aufKnopf: starteNeuePartie,
  });
}

// ------------------------------------------------------------ Schleife

function schleife(jetzt) {
  const dt = Math.min(0.1, (jetzt - letzteZeit) / 1000);
  letzteZeit = jetzt;

  if (spiel) {
    if (spiel.phase === 'vorbereitung') {
      spiel.restZeit -= dt;
      if (spiel.restZeit <= 0) beginneKampf();
    } else if (spiel.phase === 'kampf' && spiel.kampf) {
      akku += dt * tempo;
      let schritte = 0;
      while (akku >= TICK && schritte++ < 12) {
        akku -= TICK;
        if (!spiel.kampf.vorbei) schritt(spiel.kampf, TICK);
      }
      if (spiel.kampf.vorbei && uebergangsZiel === null) {
        uebergangsZiel = 'auswertung';
        uebergang = 1.1;
      }
    }

    if (uebergangsZiel) {
      uebergang -= dt;
      if (uebergang <= 0) {
        const ziel = uebergangsZiel;
        uebergangsZiel = null;
        if (ziel === 'auswertung') werteKampfAus();
        else if (ziel === 'vorbereitung') naechsteVorbereitung();
        else if (ziel === 'ende') zeigeEndstand();
      }
    }

    zeichneCanvas();
    aktualisiereKopf(spiel);
  }
  requestAnimationFrame(schleife);
}

function zeichneCanvas() {
  const belegteFelder = new Set(brettEinheiten(spiel.mensch).map((e) => `${e.feld.x},${e.feld.y}`));
  zeichne(ctx, {
    spiel,
    kampf: spiel.phase === 'kampf' || spiel.phase === 'auswertung' ? spiel.kampf : null,
    drag, hover, hoverBank, auswahl, verkaufAktiv, belegteFelder,
    gegnerVorschau: gegnerVorschau(),
  });
}

function gegnerVorschau() {
  if (spiel.phase !== 'vorbereitung' || !spiel.menschDuell) return null;
  const d = spiel.menschDuell;
  if (d.kreaturen) return { name: d.kreaturen.name, einheiten: d.kreaturen.einheiten };
  const gegner = d.a === spiel.mensch ? d.b : d.a;
  if (!gegner) return null;
  return { name: gegner.name, einheiten: aufstellung(gegner) };
}

/** Vollständige Neuzeichnung inklusive DOM-Teilen. */
function zeichneAlles() {
  zeichneLaden(spiel, aufKauf, tooltip);
  zeichneSynergien(spiel, tooltip);
  zeichneBrettInfo(spiel);
  zeichneRangliste(spiel);
  zeichneLog(spiel);
  aktualisiereKopf(spiel);
}

// ------------------------------------------------------------ Eingaben

function aufKauf(index) {
  if (spiel.phase !== 'vorbereitung') return;
  const ergebnis = kaufen(spiel.mensch, spiel.pool, index);
  if (ergebnis) {
    zeichneAlles();
  }
}

function mausPosition(ev) {
  const r = canvas.getBoundingClientRect();
  return {
    px: (ev.clientX - r.left) * (canvas.width / r.width),
    py: (ev.clientY - r.top) * (canvas.height / r.height),
  };
}

function einheitAn(px, py) {
  const zelle = pixelZuZelle(px, py);
  if (zelle) {
    const e = brettEinheiten(spiel.mensch).find((u) => u.feld.x === zelle.x && u.feld.y === zelle.y);
    if (e) return e;
  }
  const slot = pixelZuBankSlot(px, py);
  if (slot !== null) {
    const e = spiel.mensch.einheiten.find((u) => u.feld.typ === 'bank' && u.feld.slot === slot);
    if (e) return e;
  }
  return null;
}

canvas.addEventListener('pointerdown', (ev) => {
  if (!spiel || spiel.phase !== 'vorbereitung') return;
  const { px, py } = mausPosition(ev);
  const e = einheitAn(px, py);
  if (!e) { auswahl = null; return; }
  canvas.setPointerCapture(ev.pointerId);
  auswahl = e.uid;
  drag = { einheit: e, px, py, startFeld: { ...e.feld } };
  tooltip.verstecke();
});

canvas.addEventListener('pointermove', (ev) => {
  if (!spiel) return;
  const { px, py } = mausPosition(ev);
  if (drag) {
    drag.px = px;
    drag.py = py;
    verkaufAktiv = imVerkaufsfeld(px, py);
    hover = pixelZuZelle(px, py);
    hoverBank = pixelZuBankSlot(px, py);
    return;
  }
  hover = pixelZuZelle(px, py);
  hoverBank = pixelZuBankSlot(px, py);

  // Tooltip für Einheiten
  if (spiel.phase === 'vorbereitung') {
    const e = einheitAn(px, py);
    if (e) {
      const def = UNIT_BY_ID[e.defId];
      const preis = verkaufspreis(def, e.stern);
      tooltip.zeige(einheitTooltip(def, e.stern, `<div class="tt-text" style="margin-top:6px">Verkaufswert: <b style="color:#f2c76b">${preis} ◈</b></div>`), ev);
    } else {
      tooltip.verstecke();
    }
  } else {
    tooltip.verstecke();
  }
});

canvas.addEventListener('pointerup', (ev) => {
  if (!drag) return;
  const { px, py } = mausPosition(ev);
  const einheit = drag.einheit;
  const s = spiel.mensch;

  if (imVerkaufsfeld(px, py)) {
    const preis = verkaufen(s, spiel.pool, einheit.uid);
    notiz(spiel, `${UNIT_BY_ID[einheit.defId].name} verkauft (+${preis} ◈).`);
    auswahl = null;
  } else {
    const zelle = pixelZuZelle(px, py);
    const slot = pixelZuBankSlot(px, py);
    if (zelle && EIGENE_REIHEN.includes(zelle.y)) {
      if (!aufBrett(s, einheit.uid, zelle.x, zelle.y)) {
        zeigeBanner(`Nur ${maxEinheiten(s)} Einheiten – Stufe steigern!`, 'niederlage');
      }
    } else if (slot !== null) {
      aufBank(s, einheit.uid, slot);
    }
  }

  drag = null;
  verkaufAktiv = false;
  canvas.releasePointerCapture?.(ev.pointerId);
  zeichneAlles();
});

canvas.addEventListener('pointerleave', () => {
  hover = null;
  hoverBank = null;
  tooltip.verstecke();
});

document.getElementById('rerollBtn').addEventListener('click', () => {
  if (spiel.phase !== 'vorbereitung') return;
  if (reroll(spiel.mensch, spiel.pool, spiel.rng)) zeichneAlles();
});

document.getElementById('xpBtn').addEventListener('click', () => {
  if (spiel.phase !== 'vorbereitung') return;
  if (xpKaufen(spiel.mensch)) zeichneAlles();
});

document.getElementById('sperreBtn').addEventListener('click', () => {
  spiel.mensch.gesperrt = !spiel.mensch.gesperrt;
  aktualisiereKopf(spiel);
});

document.getElementById('kampfBtn').addEventListener('click', beginneKampf);

const STEUERUNG = [
  { links: 'Einheit ziehen', rechts: 'aufstellen, tauschen, auf die Bank legen' },
  { links: 'Auf das rote Feld ziehen · Entf', rechts: 'Einheit verkaufen' },
  { links: '1 – 5', rechts: 'Ladenplatz kaufen' },
  { links: 'D · F', rechts: 'Laden würfeln (2 ◈) · Erfahrung kaufen (4 ◈)' },
  { links: 'Leertaste', rechts: 'Kampf sofort beginnen' },
  { links: 'S', rechts: 'Kampftempo 1× / 2×' },
];

document.getElementById('hilfeBtn').addEventListener('click', () => {
  zeigeOverlay({
    titel: 'Steuerung',
    text: 'Drei gleiche Einheiten verschmelzen automatisch zu einer stärkeren.',
    details: STEUERUNG,
    knopfText: 'Weiterspielen',
    aufKnopf: versteckeOverlay,
  });
});

document.getElementById('menueBtn').addEventListener('click', () => {
  zeigeOverlay({
    titel: 'Neue Partie?',
    text: 'Die laufende Partie wird verworfen.',
    details: [],
    knopfText: 'Neu starten',
    aufKnopf: starteNeuePartie,
  });
});

window.addEventListener('keydown', (ev) => {
  if (!spiel) return;
  const taste = ev.key.toLowerCase();
  if (taste === 'd') { if (reroll(spiel.mensch, spiel.pool, spiel.rng)) zeichneAlles(); }
  else if (taste === 'f') { if (xpKaufen(spiel.mensch)) zeichneAlles(); }
  else if (taste === ' ') { ev.preventDefault(); beginneKampf(); }
  else if (taste === 's') { tempo = tempo === 1 ? 2 : 1; zeigeBanner(`Tempo ${tempo}×`, ''); }
  else if (taste === 'delete' || taste === 'backspace') {
    if (auswahl !== null && spiel.phase === 'vorbereitung') {
      const e = findeEinheit(spiel.mensch, auswahl);
      if (e) {
        const preis = verkaufen(spiel.mensch, spiel.pool, auswahl);
        notiz(spiel, `${UNIT_BY_ID[e.defId].name} verkauft (+${preis} ◈).`);
        auswahl = null;
        zeichneAlles();
      }
    }
  } else if (taste >= '1' && taste <= '5') {
    aufKauf(Number(taste) - 1);
  }
});

// ------------------------------------------------------------ Start

zeigeOverlay({
  titel: 'Runenschlacht',
  text: `Acht Heerführer, ein gemeinsamer Pool, ein Brett.<br>
    Kaufe Einheiten, stelle sie klug auf, sammle Synergien – drei gleiche Einheiten verschmelzen zu einer stärkeren.<br>
    Die Kämpfe laufen von selbst ab. Wer zuletzt steht, gewinnt.`,
  details: STEUERUNG,
  knopfText: 'Partie starten',
  aufKnopf: starteNeuePartie,
});

requestAnimationFrame(schleife);
