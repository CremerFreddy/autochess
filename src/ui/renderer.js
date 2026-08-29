/**
 * Zeichnet Brett, Bank, Einheiten und Kampfeffekte auf das Canvas.
 * Der Renderer liest nur Zustand – er verändert nichts am Spiel.
 */
import { BREITE, HOEHE, BANK_PLAETZE } from '../core/board.js';
import { UNIT_BY_ID, werteFuer, verkaufspreis } from '../core/units.js';
import { ORIGINS } from '../core/units.js';

export const LAYOUT = {
  breite: 1040,
  hoehe: 1000,
  zelle: 100,
  brettX: 120,
  brettY: 10,
  bankY: 822,
  bankH: 88,
  bankSlot: 84,
  bankLuecke: 6,
  bankX: 118,
  verkaufY: 918,
  verkaufH: 76,
};

export const zelleZuPixel = (x, y) => ({
  px: LAYOUT.brettX + x * LAYOUT.zelle + LAYOUT.zelle / 2,
  py: LAYOUT.brettY + y * LAYOUT.zelle + LAYOUT.zelle / 2,
});

export function pixelZuZelle(px, py) {
  const x = Math.floor((px - LAYOUT.brettX) / LAYOUT.zelle);
  const y = Math.floor((py - LAYOUT.brettY) / LAYOUT.zelle);
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

export function imVerkaufsfeld(px, py) {
  return py >= LAYOUT.verkaufY && py <= LAYOUT.verkaufY + LAYOUT.verkaufH
    && px >= LAYOUT.bankX && px <= LAYOUT.bankX + 804;
}

const TEAM_FARBEN = {
  a: { ring: '#6fc7ff', hp: '#5fd08a', schatten: 'rgba(111,199,255,.35)' },
  b: { ring: '#ff7a6b', hp: '#ff8f7a', schatten: 'rgba(255,122,107,.35)' },
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

/**
 * Hauptzeichenroutine.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} z Zustand: {spiel, kampf, drag, hover, zeit, gegnerVorschau}
 */
export function zeichne(ctx, z) {
  const { breite, hoehe } = LAYOUT;
  ctx.clearRect(0, 0, breite, hoehe);
  zeichneBrett(ctx, z);
  if (z.kampf) zeichneKampf(ctx, z);
  else zeichneVorbereitung(ctx, z);
  zeichneBank(ctx, z);
  if (z.drag) zeichneVerkaufsfeld(ctx, z);
  if (z.drag) zeichneGezogene(ctx, z);
}

// ---------------------------------------------------------------- Brett

function zeichneBrett(ctx, z) {
  const { zelle, brettX, brettY } = LAYOUT;
  const breite = BREITE * zelle;
  const hoehe = HOEHE * zelle;

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.6)';
  ctx.shadowBlur = 34;
  ctx.shadowOffsetY = 10;
  rundesRechteck(ctx, brettX - 8, brettY - 8, breite + 16, hoehe + 16, 18);
  ctx.fillStyle = '#0e141c';
  ctx.fill();
  ctx.restore();

  rundesRechteck(ctx, brettX - 8, brettY - 8, breite + 16, hoehe + 16, 18);
  ctx.strokeStyle = '#26313f';
  ctx.lineWidth = 2;
  ctx.stroke();

  for (let y = 0; y < HOEHE; y++) {
    for (let x = 0; x < BREITE; x++) {
      const px = brettX + x * zelle;
      const py = brettY + y * zelle;
      const eigen = y >= HOEHE / 2;
      const hell = (x + y) % 2 === 0;
      let farbe;
      if (eigen) farbe = hell ? '#1b2735' : '#16202c';
      else farbe = hell ? '#1e1a26' : '#181521';

      rundesRechteck(ctx, px + 3, py + 3, zelle - 6, zelle - 6, 10);
      ctx.fillStyle = farbe;
      ctx.fill();

      // Zielfelder beim Ziehen hervorheben
      if (z.drag && eigen && !z.kampf) {
        const frei = !z.belegteFelder?.has(`${x},${y}`);
        ctx.strokeStyle = frei ? 'rgba(111,199,255,.45)' : 'rgba(242,199,107,.4)';
        ctx.lineWidth = 2;
        rundesRechteck(ctx, px + 4, py + 4, zelle - 8, zelle - 8, 9);
        ctx.stroke();
      }
      if (z.hover && z.hover.x === x && z.hover.y === y && eigen && !z.kampf) {
        ctx.fillStyle = 'rgba(111,199,255,.07)';
        rundesRechteck(ctx, px + 3, py + 3, zelle - 6, zelle - 6, 10);
        ctx.fill();
      }
    }
  }

  // Mittellinie
  const mitteY = brettY + (HOEHE / 2) * zelle;
  const verlauf = ctx.createLinearGradient(brettX, mitteY, brettX + breite, mitteY);
  verlauf.addColorStop(0, 'rgba(111,199,255,0)');
  verlauf.addColorStop(0.5, 'rgba(150,190,255,.35)');
  verlauf.addColorStop(1, 'rgba(111,199,255,0)');
  ctx.fillStyle = verlauf;
  ctx.fillRect(brettX, mitteY - 1, breite, 2);
}

// ------------------------------------------------------- Vorbereitung

function zeichneVorbereitung(ctx, z) {
  const spieler = z.spiel.mensch;
  for (const e of spieler.einheiten) {
    if (e.feld.typ !== 'brett') continue;
    if (z.drag && z.drag.einheit === e) continue;
    const { px, py } = zelleZuPixel(e.feld.x, e.feld.y);
    zeichneToken(ctx, {
      px, py, defId: e.defId, stern: e.stern, team: 'a',
      hpAnteil: 1, manaAnteil: 0, groesse: 1,
      auswahl: z.auswahl === e.uid,
    });
  }

  // Gegnervorschau in der oberen Hälfte
  if (z.gegnerVorschau) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    for (const e of z.gegnerVorschau.einheiten) {
      const { px, py } = zelleZuPixel(BREITE - 1 - e.x, HOEHE - 1 - e.y);
      zeichneToken(ctx, { px, py, defId: e.defId, stern: e.stern, team: 'b', hpAnteil: 1, manaAnteil: 0, groesse: .92 });
    }
    ctx.restore();
    ctx.fillStyle = 'rgba(223,230,240,.5)';
    ctx.font = '600 15px Segoe UI, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Nächster Gegner: ${z.gegnerVorschau.name}`, LAYOUT.brettX + (BREITE * LAYOUT.zelle) / 2, LAYOUT.brettY + 26);
    ctx.textAlign = 'left';
  }
}

// ------------------------------------------------------------- Kampf

function zeichneKampf(ctx, z) {
  const kampf = z.kampf;

  for (const e of kampf.effekte) zeichneEffektHinten(ctx, e, kampf.zeit);

  const sortiert = [...kampf.einheiten].sort((a, b) => a.y - b.y);
  for (const k of sortiert) {
    if (!k.lebt) continue;
    const { px, py } = zelleZuPixel(k.x, k.y);
    const schlag = k.schlagAnim > 0 ? Math.sin(k.schlagAnim * Math.PI) * 9 : 0;
    const zielX = k.blick * schlag;
    zeichneToken(ctx, {
      px: px + zielX, py,
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
      groesse: 1,
    });
  }

  for (const e of kampf.effekte) zeichneEffektVorne(ctx, e, kampf.zeit);
}

function zeichneEffektHinten(ctx, e, zeit) {
  const t = (zeit - e.start) / e.dauer;
  if (t < 0 || t > 1) return;
  switch (e.typ) {
    case 'explosion': {
      const { px, py } = zelleZuPixel(e.x, e.y);
      const r = e.radius * LAYOUT.zelle * (0.35 + t * 0.75);
      ctx.save();
      ctx.globalAlpha = (1 - t) * 0.55;
      const g = ctx.createRadialGradient(px, py, r * 0.2, px, py, r);
      g.addColorStop(0, e.farbe);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = (1 - t) * 0.9;
      ctx.strokeStyle = e.farbe;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      break;
    }
    case 'kegel': {
      const { px, py } = zelleZuPixel(e.x, e.y);
      const laenge = e.laenge * LAYOUT.zelle * Math.min(1, t * 2.2);
      const breite = e.breite * LAYOUT.zelle;
      const winkel = Math.atan2(e.ny, e.nx);
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(winkel);
      ctx.globalAlpha = (1 - t) * 0.6;
      const g = ctx.createLinearGradient(0, 0, laenge, 0);
      g.addColorStop(0, e.farbe);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, -breite * 0.35);
      ctx.lineTo(laenge, -breite);
      ctx.lineTo(laenge, breite);
      ctx.lineTo(0, breite * 0.35);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      break;
    }
    case 'sprung': {
      const { px, py } = zelleZuPixel(e.x, e.y);
      ctx.save();
      ctx.globalAlpha = 1 - t;
      ctx.strokeStyle = '#ff7a9c';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px, py, 20 + t * 40, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      break;
    }
  }
}

function zeichneEffektVorne(ctx, e, zeit) {
  const t = (zeit - e.start) / e.dauer;
  if (t < 0 || t > 1) return;
  switch (e.typ) {
    case 'geschoss': {
      const a = zelleZuPixel(e.x1, e.y1);
      const b = zelleZuPixel(e.x2, e.y2);
      const px = a.px + (b.px - a.px) * t;
      const py = a.py + (b.py - a.py) * t - Math.sin(t * Math.PI) * 22;
      ctx.save();
      ctx.fillStyle = e.farbe;
      ctx.shadowColor = e.farbe;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      break;
    }
    case 'strahl': {
      const a = zelleZuPixel(e.x1, e.y1);
      const b = zelleZuPixel(e.x2, e.y2);
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
    case 'ring': {
      const { px, py } = zelleZuPixel(e.x, e.y);
      ctx.save();
      ctx.globalAlpha = 1 - t;
      ctx.strokeStyle = e.farbe;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(px, py, 26 + t * 22, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      break;
    }
    case 'zauber': {
      const { px, py } = zelleZuPixel(e.x, e.y);
      ctx.save();
      ctx.globalAlpha = 1 - t;
      ctx.fillStyle = e.farbe;
      ctx.font = '700 12px Segoe UI, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(e.name, px, py - 52 - t * 12);
      ctx.textAlign = 'left';
      ctx.restore();
      break;
    }
    case 'schaden': {
      const { px, py } = zelleZuPixel(e.x, e.y);
      const versatz = ((e.wert * 37) % 34) - 17; // verhindert exakt übereinander liegende Zahlen
      const farben = { physisch: '#ffffff', krit: '#ffd479', magisch: '#a9c9ff', heilung: '#7ef2a8', 'gift-tick': '#b6f26a' };
      ctx.save();
      ctx.globalAlpha = 1 - t * t;
      ctx.fillStyle = farben[e.art] || '#ffffff';
      ctx.font = `${e.art === 'krit' ? 800 : 700} ${e.art === 'krit' ? 18 : 14}px Segoe UI, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.strokeStyle = 'rgba(0,0,0,.75)';
      ctx.lineWidth = 3;
      const text = (e.art === 'heilung' ? '+' : '') + e.wert;
      ctx.strokeText(text, px + versatz, py - 36 - t * 30);
      ctx.fillText(text, px + versatz, py - 36 - t * 30);
      ctx.textAlign = 'left';
      ctx.restore();
      break;
    }
    case 'tod': {
      const { px, py } = zelleZuPixel(e.x, e.y);
      ctx.save();
      ctx.globalAlpha = (1 - t) * 0.8;
      ctx.fillStyle = TEAM_FARBEN[e.team].ring;
      ctx.beginPath();
      ctx.arc(px, py, 30 * (1 - t) + 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1 - t;
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      ctx.font = '700 26px Segoe UI, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(e.glyph, px, py + 9 - t * 18);
      ctx.textAlign = 'left';
      ctx.restore();
      break;
    }
  }
}

// -------------------------------------------------------------- Token

/** Zeichnet eine Einheit als Spielstein. */
export function zeichneToken(ctx, o) {
  const def = UNIT_BY_ID[o.defId];
  if (!def) return;
  const g = o.groesse ?? 1;
  const r = 34 * g;
  const team = TEAM_FARBEN[o.team] || TEAM_FARBEN.a;
  const originFarbe = ORIGINS[def.origin]?.farbe || '#8fa8ff';

  ctx.save();
  // Schatten
  ctx.fillStyle = 'rgba(0,0,0,.45)';
  ctx.beginPath();
  ctx.ellipse(o.px, o.py + r * 0.78, r * 0.78, r * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();

  if (o.zauber > 0) {
    ctx.globalAlpha = o.zauber * 0.6;
    ctx.fillStyle = originFarbe;
    ctx.beginPath();
    ctx.arc(o.px, o.py, r * (1.15 + o.zauber * 0.25), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Grundkörper
  const grad = ctx.createLinearGradient(o.px, o.py - r, o.px, o.py + r);
  grad.addColorStop(0, mische(originFarbe, '#ffffff', 0.28));
  grad.addColorStop(1, mische(originFarbe, '#0b1017', 0.62));
  ctx.beginPath();
  ctx.arc(o.px, o.py, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  // Teamring
  ctx.lineWidth = 3.5 * g;
  ctx.strokeStyle = team.ring;
  ctx.stroke();

  if (o.auswahl) {
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffd479';
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.arc(o.px, o.py, r + 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Trefferblitz
  if (o.treffer > 0) {
    ctx.globalAlpha = o.treffer * 0.55;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(o.px, o.py, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Symbol
  ctx.font = `700 ${Math.round(26 * g)}px "Segoe UI Symbol", "Noto Sans Symbols 2", Segoe UI, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(8,12,18,.85)';
  ctx.strokeText(def.glyph, o.px, o.py + 1);
  ctx.fillStyle = '#f4f8ff';
  ctx.fillText(def.glyph, o.px, o.py + 1);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';

  // Sterne
  if (o.stern > 1) {
    const sterne = '★'.repeat(o.stern);
    ctx.font = `700 ${Math.round(13 * g)}px Segoe UI, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(0,0,0,.8)';
    ctx.lineWidth = 3;
    ctx.strokeText(sterne, o.px, o.py - r - 5);
    ctx.fillStyle = o.stern >= 3 ? '#ffd479' : '#e6e6e6';
    ctx.fillText(sterne, o.px, o.py - r - 5);
    ctx.textAlign = 'left';
  }

  // Balken
  const bw = r * 1.85;
  const bx = o.px - bw / 2;
  const by = o.py + r * 0.98;
  if (o.hpAnteil !== undefined) {
    balken(ctx, bx, by, bw, 6 * g, o.hpAnteil, team.hp, '#0a0f15');
    if (o.schildAnteil) {
      ctx.fillStyle = 'rgba(255,255,255,.75)';
      ctx.fillRect(bx, by, bw * Math.min(1, o.schildAnteil), 6 * g);
    }
  }
  if (o.manaAnteil !== undefined && o.zeigeMana) {
    balken(ctx, bx, by + 7 * g, bw, 4 * g, o.manaAnteil, '#5aa8ff', '#0a0f15');
  }

  // Zustandssymbole
  let sx = o.px - 12;
  if (o.betaeubt) { ctx.fillStyle = '#ffd479'; ctx.font = '13px system-ui'; ctx.fillText('✳', sx, o.py - r - 16); sx += 14; }
  if (o.verwurzelt) { ctx.fillStyle = '#7ef2a8'; ctx.font = '13px system-ui'; ctx.fillText('⌇', sx, o.py - r - 16); sx += 14; }
  if (o.gift) { ctx.fillStyle = '#b6f26a'; ctx.font = '13px system-ui'; ctx.fillText('☣', sx, o.py - r - 16); }

  ctx.restore();
}

function balken(ctx, x, y, w, h, anteil, farbe, hintergrund) {
  ctx.fillStyle = hintergrund;
  rundesRechteck(ctx, x - 1, y - 1, w + 2, h + 2, 3);
  ctx.fill();
  ctx.fillStyle = farbe;
  rundesRechteck(ctx, x, y, Math.max(0, w * Math.min(1, anteil)), h, 2);
  ctx.fill();
}

function mische(a, b, t) {
  const p = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  const [r1, g1, b1] = p(a);
  const [r2, g2, b2] = p(b);
  const m = (x, y) => Math.round(x + (y - x) * t);
  return `rgb(${m(r1, r2)},${m(g1, g2)},${m(b1, b2)})`;
}

// --------------------------------------------------------------- Bank

function zeichneBank(ctx, z) {
  const spieler = z.spiel.mensch;
  for (let i = 0; i < BANK_PLAETZE; i++) {
    const r = bankSlotRechteck(i);
    rundesRechteck(ctx, r.x, r.y, r.w, r.h, 10);
    ctx.fillStyle = z.hoverBank === i ? '#1b2735' : '#131a24';
    ctx.fill();
    ctx.strokeStyle = z.drag ? 'rgba(111,199,255,.35)' : '#232e3c';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  for (const e of spieler.einheiten) {
    if (e.feld.typ !== 'bank') continue;
    if (z.drag && z.drag.einheit === e) continue;
    const r = bankSlotRechteck(e.feld.slot);
    zeichneToken(ctx, {
      px: r.x + r.w / 2, py: r.y + r.h / 2,
      defId: e.defId, stern: e.stern, team: 'a',
      groesse: 0.72, auswahl: z.auswahl === e.uid,
    });
  }
}

function zeichneVerkaufsfeld(ctx, z) {
  const einheit = z.drag.einheit;
  const def = UNIT_BY_ID[einheit.defId];
  const preis = verkaufspreis(def, einheit.stern);
  const aktiv = z.verkaufAktiv;
  const y = LAYOUT.verkaufY;
  const h = LAYOUT.verkaufH;
  rundesRechteck(ctx, LAYOUT.bankX, y, 804, h, 12);
  ctx.fillStyle = aktiv ? 'rgba(255,107,122,.28)' : 'rgba(255,107,122,.09)';
  ctx.fill();
  ctx.strokeStyle = aktiv ? '#ff6b7a' : 'rgba(255,107,122,.45)';
  ctx.lineWidth = aktiv ? 3 : 1.5;
  ctx.setLineDash([9, 6]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = aktiv ? '#ffd7dc' : 'rgba(255,180,190,.8)';
  ctx.font = '700 17px Segoe UI, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${def.name} verkaufen  ·  +${preis} ◈`, LAYOUT.bankX + 402, y + h / 2 + 6);
  ctx.textAlign = 'left';
}

function zeichneGezogene(ctx, z) {
  const e = z.drag.einheit;
  zeichneToken(ctx, {
    px: z.drag.px, py: z.drag.py,
    defId: e.defId, stern: e.stern, team: 'a',
    groesse: 1.06,
  });
}
