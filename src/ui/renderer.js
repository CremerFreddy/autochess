/**
 * Zeichnet Brett, Bank, Figuren und Kampfeffekte in schräger 2.5D-Ansicht.
 * Der Renderer liest nur Zustand – er verändert nichts am Spiel.
 */
import { BREITE, HOEHE, BANK_PLAETZE } from '../core/board.js';
import { UNIT_BY_ID, ORIGINS, verkaufspreis } from '../core/units.js';
import { P, projiziere, feldMitte, entprojiziere, figurHoehe } from './perspektive.js';

export const LAYOUT = {
  breite: P.breite,
  hoehe: P.hoehe,
  bankY: 726,
  bankH: 96,
  bankSlot: 88,
  bankLuecke: 7,
  bankX: 96,
  bankBreite: 848,
  verkaufY: 836,
  verkaufH: 74,
};

/** Bildpunkt -> Feld, oder null außerhalb des Bretts. */
export function pixelZuZelle(px, py) {
  const b = entprojiziere(px, py);
  if (!b) return null;
  const x = Math.floor(b.bx);
  const y = Math.floor(b.by);
  if (x < 0 || x >= BREITE || y < 0 || y >= HOEHE) return null;
  return { x, y };
}

export const bankSlotRechteck = (i) => ({
  x: LAYOUT.bankX + i * (LAYOUT.bankSlot + LAYOUT.bankLuecke),
  y: LAYOUT.bankY,
  w: LAYOUT.bankSlot,
  h: LAYOUT.bankH,
});

export function pixelZuBankSlot(px, py) {
  if (py < LAYOUT.bankY || py > LAYOUT.bankY + LAYOUT.bankH) return null;
  for (let i = 0; i < BANK_PLAETZE; i++) {
    const r = bankSlotRechteck(i);
    if (px >= r.x && px <= r.x + r.w) return i;
  }
  return null;
}

export const imVerkaufsfeld = (px, py) =>
  py >= LAYOUT.verkaufY && py <= LAYOUT.verkaufY + LAYOUT.verkaufH
  && px >= LAYOUT.bankX && px <= LAYOUT.bankX + LAYOUT.bankBreite;

const TEAM = {
  a: { ring: '#7cd0ff', hell: '#bfe8ff', hp: '#5fd08a', boden: 'rgba(124,208,255,.30)' },
  b: { ring: '#ff8a76', hell: '#ffc4b8', hp: '#ff8f7a', boden: 'rgba(255,138,118,.30)' },
};

function rundesRechteck(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Pfad eines Feldes als projiziertes Viereck (mit kleiner Fuge). */
function feldPfad(ctx, x, y, fuge = 0.04) {
  const a = projiziere(x + fuge, y + fuge);
  const b = projiziere(x + 1 - fuge, y + fuge);
  const c = projiziere(x + 1 - fuge, y + 1 - fuge);
  const d = projiziere(x + fuge, y + 1 - fuge);
  ctx.beginPath();
  ctx.moveTo(a.px, a.py);
  ctx.lineTo(b.px, b.py);
  ctx.lineTo(c.px, c.py);
  ctx.lineTo(d.px, d.py);
  ctx.closePath();
}

// ------------------------------------------------------------- Hauptlauf

export function zeichne(ctx, z) {
  ctx.clearRect(0, 0, LAYOUT.breite, LAYOUT.hoehe);
  zeichneBrett(ctx, z);
  if (z.kampf) zeichneKampf(ctx, z);
  else zeichneVorbereitung(ctx, z);
  zeichneBank(ctx, z);
  if (z.drag) {
    zeichneVerkaufsfeld(ctx, z);
    zeichneGezogene(ctx, z);
  }
}

// ---------------------------------------------------------------- Brett

function zeichneBrett(ctx, z) {
  const ecken = [projiziere(0, 0), projiziere(BREITE, 0), projiziere(BREITE, HOEHE), projiziere(0, HOEHE)];

  // Materialstärke: dieselbe Fläche nach unten versetzt
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(ecken[0].px, ecken[0].py);
  for (const e of ecken.slice(1)) ctx.lineTo(e.px, e.py);
  for (let i = ecken.length - 1; i >= 0; i--) ctx.lineTo(ecken[i].px, ecken[i].py + P.brettDicke);
  ctx.closePath();
  const seite = ctx.createLinearGradient(0, ecken[0].py, 0, ecken[2].py + P.brettDicke);
  seite.addColorStop(0, '#0a0e14');
  seite.addColorStop(1, '#05080c');
  ctx.fillStyle = seite;
  ctx.shadowColor = 'rgba(0,0,0,.65)';
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 16;
  ctx.fill();
  ctx.restore();

  // Grundfläche
  ctx.beginPath();
  ctx.moveTo(ecken[0].px, ecken[0].py);
  for (const e of ecken.slice(1)) ctx.lineTo(e.px, e.py);
  ctx.closePath();
  const boden = ctx.createLinearGradient(0, ecken[0].py, 0, ecken[2].py);
  boden.addColorStop(0, '#141a26');
  boden.addColorStop(1, '#0f151e');
  ctx.fillStyle = boden;
  ctx.fill();

  for (let y = 0; y < HOEHE; y++) {
    for (let x = 0; x < BREITE; x++) {
      const eigen = y >= HOEHE / 2;
      const hell = (x + y) % 2 === 0;
      feldPfad(ctx, x, y);
      if (eigen) ctx.fillStyle = hell ? '#22303f' : '#1a2532';
      else ctx.fillStyle = hell ? '#2a2233' : '#211b2a';
      ctx.fill();

      // Kantenlicht: obere Kante etwas heller
      const a = projiziere(x + 0.04, y + 0.04);
      const b = projiziere(x + 0.96, y + 0.04);
      ctx.strokeStyle = eigen ? 'rgba(150,200,255,.10)' : 'rgba(200,170,255,.08)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(a.px, a.py);
      ctx.lineTo(b.px, b.py);
      ctx.stroke();

      if (!z.kampf && eigen) {
        if (z.drag) {
          const frei = !z.belegteFelder?.has(`${x},${y}`);
          feldPfad(ctx, x, y, 0.08);
          ctx.strokeStyle = frei ? 'rgba(124,208,255,.5)' : 'rgba(242,199,107,.45)';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        if (z.hover && z.hover.x === x && z.hover.y === y) {
          feldPfad(ctx, x, y);
          ctx.fillStyle = 'rgba(124,208,255,.13)';
          ctx.fill();
        }
      }
    }
  }

  // Mittellinie als leuchtende Kante
  const ml = projiziere(0, HOEHE / 2);
  const mr = projiziere(BREITE, HOEHE / 2);
  const glanz = ctx.createLinearGradient(ml.px, ml.py, mr.px, mr.py);
  glanz.addColorStop(0, 'rgba(140,190,255,0)');
  glanz.addColorStop(0.5, 'rgba(160,200,255,.45)');
  glanz.addColorStop(1, 'rgba(140,190,255,0)');
  ctx.strokeStyle = glanz;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(ml.px, ml.py);
  ctx.lineTo(mr.px, mr.py);
  ctx.stroke();
}

// -------------------------------------------------------- Vorbereitung

function zeichneVorbereitung(ctx, z) {
  const spieler = z.spiel.mensch;
  const figuren = [];

  if (z.gegnerVorschau) {
    for (const e of z.gegnerVorschau.einheiten) {
      figuren.push({
        bx: BREITE - 1 - e.x + 0.5, by: HOEHE - 1 - e.y + 0.5,
        defId: e.defId, stern: e.stern, team: 'b', hpAnteil: 1, blass: true,
      });
    }
  }
  for (const e of spieler.einheiten) {
    if (e.feld.typ !== 'brett') continue;
    if (z.drag && z.drag.einheit === e) continue;
    figuren.push({
      bx: e.feld.x + 0.5, by: e.feld.y + 0.5,
      defId: e.defId, stern: e.stern, team: 'a', hpAnteil: 1,
      auswahl: z.auswahl === e.uid,
    });
  }

  figuren.sort((a, b) => a.by - b.by);
  for (const f of figuren) zeichneFigur(ctx, f);

  if (z.gegnerVorschau) {
    const p = projiziere(BREITE / 2, 0);
    ctx.save();
    ctx.fillStyle = 'rgba(223,230,240,.55)';
    ctx.font = '600 15px Segoe UI, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Nächster Gegner: ${z.gegnerVorschau.name}`, p.px, p.py - 16);
    ctx.restore();
  }
}

// --------------------------------------------------------------- Kampf

function zeichneKampf(ctx, z) {
  const kampf = z.kampf;
  for (const e of kampf.effekte) zeichneEffektBoden(ctx, e, kampf.zeit);

  const lebende = kampf.einheiten.filter((k) => k.lebt).sort((a, b) => a.y - b.y);
  for (const k of lebende) {
    const schlag = k.schlagAnim > 0 ? Math.sin(k.schlagAnim * Math.PI) * 0.16 : 0;
    zeichneFigur(ctx, {
      bx: k.x + 0.5 + k.blick * schlag, by: k.y + 0.5,
      defId: k.defId, stern: k.stern, team: k.team,
      hpAnteil: Math.max(0, k.hp / k.maxHp),
      manaAnteil: k.maxMana ? k.mana / k.maxMana : 0,
      zeigeMana: k.maxMana > 0,
      schildAnteil: k.schild > 0 ? Math.min(1, k.schild / k.maxHp) : 0,
      treffer: k.trefferAnim,
      zauber: k.zauberAnim,
      betaeubt: kampf.zeit < k.stunBis,
      verwurzelt: kampf.zeit < k.wurzelBis,
      gift: k.dots.length > 0,
    });
  }

  for (const e of kampf.effekte) zeichneEffektLuft(ctx, e, kampf.zeit);
}

/** Effekte, die auf dem Boden liegen (unter den Figuren). */
function zeichneEffektBoden(ctx, e, zeit) {
  const t = (zeit - e.start) / e.dauer;
  if (t < 0 || t > 1) return;
  switch (e.typ) {
    case 'explosion': {
      const p = feldMitte(e.x, e.y);
      const rx = e.radius * P.vordereZelle * p.s * (0.35 + t * 0.75);
      const ry = rx * 0.42;
      ctx.save();
      ctx.globalAlpha = (1 - t) * 0.5;
      const g = ctx.createRadialGradient(p.px, p.py, rx * 0.15, p.px, p.py, rx);
      g.addColorStop(0, e.farbe);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(p.px, p.py, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = (1 - t) * 0.95;
      ctx.strokeStyle = e.farbe;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(p.px, p.py, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      break;
    }
    case 'kegel': {
      // Als projiziertes Viereck auf der Bodenebene
      const laenge = e.laenge * Math.min(1, t * 2.2);
      const bx = e.x + 0.5;
      const by = e.y + 0.5;
      const qx = -e.ny;
      const qy = e.nx;
      const ecken = [
        [bx + qx * e.breite * 0.3, by + qy * e.breite * 0.3],
        [bx + e.nx * laenge + qx * e.breite, by + e.ny * laenge + qy * e.breite],
        [bx + e.nx * laenge - qx * e.breite, by + e.ny * laenge - qy * e.breite],
        [bx - qx * e.breite * 0.3, by - qy * e.breite * 0.3],
      ].map(([x, y]) => projiziere(x, y));
      ctx.save();
      ctx.globalAlpha = (1 - t) * 0.55;
      ctx.beginPath();
      ctx.moveTo(ecken[0].px, ecken[0].py);
      for (const p of ecken.slice(1)) ctx.lineTo(p.px, p.py);
      ctx.closePath();
      const g = ctx.createLinearGradient(ecken[0].px, ecken[0].py, ecken[1].px, ecken[1].py);
      g.addColorStop(0, e.farbe);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.restore();
      break;
    }
    case 'ring':
    case 'sprung': {
      const p = feldMitte(e.x, e.y);
      const rx = (e.typ === 'sprung' ? 22 + t * 46 : 26 + t * 24) * p.s;
      ctx.save();
      ctx.globalAlpha = 1 - t;
      ctx.strokeStyle = e.farbe || '#ff7a9c';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(p.px, p.py, rx, rx * 0.42, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      break;
    }
  }
}

/** Effekte in Kopfhöhe (über den Figuren). */
function zeichneEffektLuft(ctx, e, zeit) {
  const t = (zeit - e.start) / e.dauer;
  if (t < 0 || t > 1) return;
  const kopf = (bx, by) => {
    const p = feldMitte(bx, by);
    // Schriftgröße nach hinten nur gedämpft verkleinern, sonst wird sie unlesbar.
    return { px: p.px, py: p.py - figurHoehe(p.s) * 0.95, s: p.s, sText: 0.72 + p.s * 0.28 };
  };
  switch (e.typ) {
    case 'geschoss': {
      const bx = e.x1 + (e.x2 - e.x1) * t;
      const by = e.y1 + (e.y2 - e.y1) * t;
      const p = kopf(bx, by);
      const bogen = Math.sin(t * Math.PI) * 26 * p.s;
      ctx.save();
      ctx.fillStyle = e.farbe;
      ctx.shadowColor = e.farbe;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(p.px, p.py - bogen, 5 * p.s, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      break;
    }
    case 'strahl': {
      const a = kopf(e.x1, e.y1);
      const b = kopf(e.x2, e.y2);
      ctx.save();
      ctx.globalAlpha = 1 - t;
      ctx.strokeStyle = e.farbe;
      ctx.lineWidth = 4;
      ctx.shadowColor = e.farbe;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.moveTo(a.px, a.py);
      const mx = (a.px + b.px) / 2 + (b.py - a.py) * 0.12;
      const my = (a.py + b.py) / 2 - (b.px - a.px) * 0.12;
      ctx.quadraticCurveTo(mx, my, b.px, b.py);
      ctx.stroke();
      ctx.restore();
      break;
    }
    case 'zauber': {
      const p = kopf(e.x, e.y);
      ctx.save();
      ctx.globalAlpha = 1 - t;
      ctx.fillStyle = e.farbe;
      ctx.font = `700 ${Math.round(13 * p.sText)}px Segoe UI, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(e.name, p.px, p.py - 34 * p.s - t * 12);
      ctx.restore();
      break;
    }
    case 'schaden': {
      const p = kopf(e.x, e.y + 0.2);
      const versatz = (((e.wert * 37) % 34) - 17) * p.sText;
      const farben = { physisch: '#ffffff', krit: '#ffd479', magisch: '#a9c9ff', heilung: '#7ef2a8', 'gift-tick': '#b6f26a' };
      ctx.save();
      ctx.globalAlpha = 1 - t * t;
      ctx.fillStyle = farben[e.art] || '#ffffff';
      ctx.font = `${e.art === 'krit' ? 800 : 700} ${Math.round((e.art === 'krit' ? 20 : 16) * p.sText)}px Segoe UI, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.strokeStyle = 'rgba(0,0,0,.8)';
      ctx.lineWidth = 3;
      const text = (e.art === 'heilung' ? '+' : '') + e.wert;
      ctx.strokeText(text, p.px + versatz, p.py - 26 * p.sText - t * 34);
      ctx.fillText(text, p.px + versatz, p.py - 26 * p.sText - t * 34);
      ctx.restore();
      break;
    }
    case 'tod': {
      const p = feldMitte(e.x, e.y);
      ctx.save();
      ctx.globalAlpha = (1 - t) * 0.85;
      ctx.fillStyle = TEAM[e.team].ring;
      ctx.beginPath();
      ctx.ellipse(p.px, p.py, (30 * (1 - t) + 8) * p.s, (30 * (1 - t) + 8) * p.s * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1 - t;
      ctx.fillStyle = 'rgba(255,255,255,.9)';
      ctx.font = `700 ${Math.round(26 * p.s)}px Segoe UI, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(e.glyph, p.px, p.py - figurHoehe(p.s) - t * 26);
      ctx.restore();
      break;
    }
  }
}

// -------------------------------------------------------------- Figuren

/**
 * Zeichnet eine stehende Spielfigur: Sockel auf dem Boden, Körper, Kopf.
 * Erwartet Brettkoordinaten (bx, by) – oder feste Bildpunkte (px, py, s).
 */
export function zeichneFigur(ctx, o) {
  const def = UNIT_BY_ID[o.defId];
  if (!def) return;
  const p = o.px !== undefined ? { px: o.px, py: o.py, s: o.s ?? 1 } : projiziere(o.bx, o.by);
  const g = p.s * (o.groesse ?? 1);
  const team = TEAM[o.team] || TEAM.a;
  const originFarbe = ORIGINS[def.origin]?.farbe || '#8fa8ff';

  const kopfR = 27 * g;
  const hoehe = 56 * g;
  const sockelRx = 30 * g;
  const sockelRy = 11.5 * g;
  const kopfY = p.py - hoehe;

  ctx.save();
  if (o.blass) ctx.globalAlpha = 0.42;

  // Schatten auf dem Boden
  const schatten = ctx.createRadialGradient(p.px, p.py, 1, p.px, p.py, sockelRx * 1.25);
  schatten.addColorStop(0, 'rgba(0,0,0,.55)');
  schatten.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = schatten;
  ctx.beginPath();
  ctx.ellipse(p.px, p.py + sockelRy * 0.25, sockelRx * 1.25, sockelRy * 1.15, 0, 0, Math.PI * 2);
  ctx.fill();

  if (o.auswahl) {
    ctx.strokeStyle = '#ffd479';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.ellipse(p.px, p.py, sockelRx * 1.18, sockelRy * 1.18, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Sockel in Teamfarbe
  ctx.fillStyle = team.boden;
  ctx.beginPath();
  ctx.ellipse(p.px, p.py, sockelRx, sockelRy, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = team.ring;
  ctx.lineWidth = 2.2 * g;
  ctx.stroke();

  if (o.zauber > 0) {
    ctx.save();
    ctx.globalAlpha = o.zauber * 0.5;
    ctx.strokeStyle = originFarbe;
    ctx.lineWidth = 3 * g;
    ctx.beginPath();
    ctx.ellipse(p.px, p.py, sockelRx * (1.1 + o.zauber * 0.5), sockelRy * (1.1 + o.zauber * 0.5), 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Körper: verjüngt sich vom Sockel zum Kopf
  const unten = sockelRx * 0.66;
  const oben = kopfR * 0.62;
  ctx.beginPath();
  ctx.moveTo(p.px - unten, p.py);
  ctx.quadraticCurveTo(p.px - unten * 0.95, kopfY + kopfR * 0.7, p.px - oben, kopfY + kopfR * 0.35);
  ctx.lineTo(p.px + oben, kopfY + kopfR * 0.35);
  ctx.quadraticCurveTo(p.px + unten * 0.95, kopfY + kopfR * 0.7, p.px + unten, p.py);
  ctx.closePath();
  const koerper = ctx.createLinearGradient(p.px - unten, 0, p.px + unten, 0);
  koerper.addColorStop(0, mische(originFarbe, '#080c12', 0.72));
  koerper.addColorStop(0.42, mische(originFarbe, '#0b1017', 0.42));
  koerper.addColorStop(1, mische(originFarbe, '#080c12', 0.78));
  ctx.fillStyle = koerper;
  ctx.fill();

  // Kopf
  const kopf = ctx.createRadialGradient(p.px - kopfR * 0.35, kopfY - kopfR * 0.4, kopfR * 0.15, p.px, kopfY, kopfR);
  kopf.addColorStop(0, mische(originFarbe, '#ffffff', 0.45));
  kopf.addColorStop(1, mische(originFarbe, '#0b1017', 0.55));
  ctx.beginPath();
  ctx.arc(p.px, kopfY, kopfR, 0, Math.PI * 2);
  ctx.fillStyle = kopf;
  ctx.fill();
  ctx.lineWidth = 2.6 * g;
  ctx.strokeStyle = team.ring;
  ctx.stroke();

  if (o.treffer > 0) {
    ctx.globalAlpha = o.treffer * 0.6;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(p.px, kopfY, kopfR, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = o.blass ? 0.42 : 1;
  }

  // Symbol
  ctx.font = `700 ${Math.round(27 * g)}px "Segoe UI Symbol", "Noto Sans Symbols 2", Segoe UI, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = 'rgba(8,12,18,.8)';
  ctx.strokeText(def.glyph, p.px, kopfY + 1);
  ctx.fillStyle = '#f6faff';
  ctx.fillText(def.glyph, p.px, kopfY + 1);
  ctx.textBaseline = 'alphabetic';

  let obenY = kopfY - kopfR - 6 * g;

  // Sterne
  if (o.stern > 1) {
    const sterne = '★'.repeat(o.stern);
    ctx.font = `700 ${Math.round(13 * g)}px Segoe UI, system-ui, sans-serif`;
    ctx.strokeStyle = 'rgba(0,0,0,.85)';
    ctx.lineWidth = 3;
    ctx.strokeText(sterne, p.px, obenY);
    ctx.fillStyle = o.stern >= 3 ? '#ffd479' : '#e9eef5';
    ctx.fillText(sterne, p.px, obenY);
    obenY -= 13 * g;
  }
  ctx.textAlign = 'left';

  // Leben und Mana über dem Kopf
  if (o.hpAnteil !== undefined && !o.blass) {
    const bw = 48 * g;
    const bx = p.px - bw / 2;
    const by = obenY - 8 * g;
    balken(ctx, bx, by, bw, 6 * g, o.hpAnteil, team.hp);
    if (o.schildAnteil) {
      ctx.fillStyle = 'rgba(255,255,255,.8)';
      ctx.fillRect(bx, by, bw * Math.min(1, o.schildAnteil), 6 * g);
    }
    if (o.zeigeMana) balken(ctx, bx, by - 6 * g, bw, 4 * g, o.manaAnteil, '#5aa8ff');
  }

  // Zustandssymbole
  const zeichen = [];
  if (o.betaeubt) zeichen.push(['✳', '#ffd479']);
  if (o.verwurzelt) zeichen.push(['⌇', '#7ef2a8']);
  if (o.gift) zeichen.push(['☣', '#b6f26a']);
  if (zeichen.length) {
    ctx.font = `${Math.round(13 * g)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    zeichen.forEach(([sym, farbe], i) => {
      ctx.fillStyle = farbe;
      ctx.fillText(sym, p.px + (i - (zeichen.length - 1) / 2) * 14 * g, kopfY + kopfR + 14 * g);
    });
    ctx.textAlign = 'left';
  }

  ctx.restore();
}

function balken(ctx, x, y, w, h, anteil, farbe) {
  ctx.fillStyle = 'rgba(6,10,15,.85)';
  rundesRechteck(ctx, x - 1, y - 1, w + 2, h + 2, 3);
  ctx.fill();
  ctx.fillStyle = farbe;
  rundesRechteck(ctx, x, y, Math.max(0, w * Math.min(1, anteil)), h, 2);
  ctx.fill();
}

function mische(a, b, t) {
  const teil = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  const [r1, g1, b1] = teil(a);
  const [r2, g2, b2] = teil(b);
  const m = (x, y) => Math.round(x + (y - x) * t);
  return `rgb(${m(r1, r2)},${m(g1, g2)},${m(b1, b2)})`;
}

// ----------------------------------------------------------------- Bank

function zeichneBank(ctx, z) {
  const spieler = z.spiel.mensch;
  ctx.save();
  rundesRechteck(ctx, LAYOUT.bankX - 10, LAYOUT.bankY - 10, LAYOUT.bankBreite + 20, LAYOUT.bankH + 20, 14);
  ctx.fillStyle = 'rgba(12,17,24,.7)';
  ctx.fill();
  ctx.strokeStyle = '#1e2836';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  for (let i = 0; i < BANK_PLAETZE; i++) {
    const r = bankSlotRechteck(i);
    rundesRechteck(ctx, r.x, r.y, r.w, r.h, 10);
    ctx.fillStyle = z.hoverBank === i && z.drag ? '#1d2a39' : '#131a24';
    ctx.fill();
    ctx.strokeStyle = z.drag ? 'rgba(124,208,255,.4)' : '#232e3c';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  for (const e of spieler.einheiten) {
    if (e.feld.typ !== 'bank') continue;
    if (z.drag && z.drag.einheit === e) continue;
    const r = bankSlotRechteck(e.feld.slot);
    zeichneFigur(ctx, {
      px: r.x + r.w / 2, py: r.y + r.h - 16, s: 0.66,
      defId: e.defId, stern: e.stern, team: 'a',
      auswahl: z.auswahl === e.uid,
    });
  }
}

function zeichneVerkaufsfeld(ctx, z) {
  const einheit = z.drag.einheit;
  const def = UNIT_BY_ID[einheit.defId];
  const preis = verkaufspreis(def, einheit.stern);
  const aktiv = z.verkaufAktiv;
  rundesRechteck(ctx, LAYOUT.bankX, LAYOUT.verkaufY, LAYOUT.bankBreite, LAYOUT.verkaufH, 12);
  ctx.fillStyle = aktiv ? 'rgba(255,107,122,.3)' : 'rgba(255,107,122,.09)';
  ctx.fill();
  ctx.strokeStyle = aktiv ? '#ff6b7a' : 'rgba(255,107,122,.45)';
  ctx.lineWidth = aktiv ? 3 : 1.5;
  ctx.setLineDash([9, 6]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = aktiv ? '#ffd7dc' : 'rgba(255,180,190,.85)';
  ctx.font = '700 17px Segoe UI, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${def.name} verkaufen · +${preis} ◈`,
    LAYOUT.bankX + LAYOUT.bankBreite / 2, LAYOUT.verkaufY + LAYOUT.verkaufH / 2 + 6);
  ctx.textAlign = 'left';
}

function zeichneGezogene(ctx, z) {
  const e = z.drag.einheit;
  zeichneFigur(ctx, {
    px: z.drag.px, py: z.drag.py + 18, s: 0.95,
    defId: e.defId, stern: e.stern, team: 'a',
  });
}
