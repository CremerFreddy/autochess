/**
 * Spielfeld-Geometrie und Wegfindung.
 *
 * Das Brett ist 8x8. Die unteren vier Reihen (y = 4..7) gehören dem Spieler,
 * die oberen vier (y = 0..3) dem Gegner. Im Kampf wird das gegnerische Brett
 * gespiegelt in die obere Hälfte kopiert.
 */

export const BREITE = 8;
export const HOEHE = 8;
export const EIGENE_REIHEN = [4, 5, 6, 7];
export const BANK_PLAETZE = 9;

export const idx = (x, y) => y * BREITE + x;
export const imFeld = (x, y) => x >= 0 && x < BREITE && y >= 0 && y < HOEHE;
export const isEigeneHaelfte = (y) => y >= HOEHE / 2;

/** Spiegelt eine Position an der Brettmitte (für den Gegner im Kampf). */
export const spiegel = (x, y) => ({ x: BREITE - 1 - x, y: HOEHE - 1 - y });

export const distanz = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

const RICHTUNGEN = [
  [0, -1], [1, 0], [0, 1], [-1, 0],
  [1, -1], [1, 1], [-1, 1], [-1, -1],
];

/**
 * Breitensuche vom Ziel aus über alle freien Felder; liefert eine
 * Distanzkarte. `blockiert(x,y)` markiert belegte Felder – das Zielfeld
 * selbst ist immer begehbar, damit Einheiten heranrücken können.
 */
export function distanzKarte(zx, zy, blockiert) {
  const dist = new Int16Array(BREITE * HOEHE).fill(-1);
  const queue = [idx(zx, zy)];
  dist[idx(zx, zy)] = 0;
  for (let head = 0; head < queue.length; head++) {
    const c = queue[head];
    const cx = c % BREITE;
    const cy = (c - cx) / BREITE;
    const d = dist[c];
    for (const [dx, dy] of RICHTUNGEN) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (!imFeld(nx, ny)) continue;
      const n = idx(nx, ny);
      if (dist[n] !== -1) continue;
      if (blockiert(nx, ny)) continue;
      dist[n] = d + 1;
      queue.push(n);
    }
  }
  return dist;
}

/**
 * Nächster Schritt von (vx,vy) Richtung (zx,zy). Gibt `null` zurück, wenn kein
 * Weg existiert oder die Einheit bereits am Ziel steht.
 */
export function naechsterSchritt(vx, vy, zx, zy, blockiert) {
  if (vx === zx && vy === zy) return null;
  const dist = distanzKarte(zx, zy, (x, y) => (x === vx && y === vy ? false : blockiert(x, y)));
  let beste = null;
  let besteD = dist[idx(vx, vy)];
  if (besteD === -1) besteD = Infinity;
  for (const [dx, dy] of RICHTUNGEN) {
    const nx = vx + dx;
    const ny = vy + dy;
    if (!imFeld(nx, ny) || blockiert(nx, ny)) continue;
    const d = dist[idx(nx, ny)];
    if (d === -1) continue;
    if (d < besteD) {
      besteD = d;
      beste = { x: nx, y: ny };
    }
  }
  if (beste) return beste;

  // Kein Weg über freie Felder: notfalls direkt in Richtung Ziel drängeln.
  let fallback = null;
  let fallbackD = distanz(vx, vy, zx, zy);
  for (const [dx, dy] of RICHTUNGEN) {
    const nx = vx + dx;
    const ny = vy + dy;
    if (!imFeld(nx, ny) || blockiert(nx, ny)) continue;
    const d = distanz(nx, ny, zx, zy);
    if (d < fallbackD) {
      fallbackD = d;
      fallback = { x: nx, y: ny };
    }
  }
  return fallback;
}

/** Freies Feld möglichst nah an (zx,zy) – für Assassinen-Sprünge. */
export function freiesFeldNahe(zx, zy, blockiert) {
  if (imFeld(zx, zy) && !blockiert(zx, zy)) return { x: zx, y: zy };
  for (let r = 1; r < Math.max(BREITE, HOEHE); r++) {
    let bestes = null;
    let besteD = Infinity;
    for (let y = zy - r; y <= zy + r; y++) {
      for (let x = zx - r; x <= zx + r; x++) {
        if (!imFeld(x, y) || blockiert(x, y)) continue;
        const d = distanz(x, y, zx, zy);
        if (d < besteD) {
          besteD = d;
          bestes = { x, y };
        }
      }
    }
    if (bestes) return bestes;
  }
  return null;
}
