/**
 * Perspektivische Projektion der Bodenebene (2.5D).
 *
 * Das Brett liegt als Ebene schräg vor der Kamera: hintere Reihen erscheinen
 * kleiner und rücken zusammen, vordere Reihen sind groß und breit.
 *
 * Brettkoordinaten (bx, by) laufen von 0 bis 8, ganze Zahlen sind Feldecken.
 * by = 0 ist die hinterste Reihe (gegnerische Grundlinie), by = 8 die vorderste.
 *
 * Herleitung: Für eine Bodenebene unter einer Lochkamera gilt Bildhöhe ~ 1/Tiefe.
 * Mit der Tiefe z(v) = 1 + D·(1−v) ergibt sich der Maßstab s(v) = 1/z(v);
 * die Bildzeile ist eine lineare Funktion von s.
 */
import { BREITE, HOEHE } from '../core/board.js';

export const P = {
  breite: 1040,
  hoehe: 940,
  mitteX: 520,
  hintenY: 58,        // Bildzeile der hintersten Kante
  vornY: 688,         // Bildzeile der vordersten Kante
  vordereZelle: 117,  // Feldbreite an der Vorderkante
  tiefe: 0.62,        // Stärke der Perspektive (0 = flach)
  einheitHoehe: 56,   // Figurenhöhe in Pixeln an der Vorderkante
  brettDicke: 26,     // sichtbare Materialstärke des Bretts
};

const s0 = 1 / (1 + P.tiefe);                 // Maßstab an der Hinterkante
const A = (P.vornY - P.hintenY) / (1 - s0);   // Bildzeile = A·s + B
const B = P.hintenY - A * s0;

/** Maßstab in der Tiefe v (0 = hinten, 1 = vorne). */
export const massstab = (v) => 1 / (1 + P.tiefe * (1 - v));

/**
 * Projiziert einen Punkt der Bodenebene auf das Bild.
 * @returns {{px:number, py:number, s:number}} Bildpunkt und lokaler Maßstab
 */
export function projiziere(bx, by) {
  const v = by / HOEHE;
  const s = massstab(v);
  return {
    px: P.mitteX + (bx - BREITE / 2) * P.vordereZelle * s,
    py: A * s + B,
    s,
  };
}

/** Mittelpunkt eines Feldes (Feldindizes, nicht Ecken). */
export const feldMitte = (x, y) => projiziere(x + 0.5, y + 0.5);

/**
 * Umkehrung der Projektion: Bildpunkt -> Brettkoordinaten.
 * Liefert null, wenn der Punkt nicht auf der Brettebene liegt.
 */
export function entprojiziere(px, py) {
  const s = (py - B) / A;
  if (s <= 0.001) return null;
  const v = 1 - (1 / s - 1) / P.tiefe;
  if (v < 0 || v > 1) return null;
  const bx = BREITE / 2 + (px - P.mitteX) / (P.vordereZelle * s);
  if (bx < 0 || bx > BREITE) return null;
  return { bx, by: v * HOEHE, s };
}

/** Höhe einer stehenden Figur in Bildpunkten, abhängig von der Tiefe. */
export const figurHoehe = (s) => P.einheitHoehe * s;
