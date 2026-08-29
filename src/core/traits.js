/**
 * Berechnet aktive Synergien für ein Brett.
 * Mehrere Exemplare derselben Einheit zählen – wie im Genre üblich – nur einmal.
 */
import { TRAITS, UNIT_BY_ID } from './units.js';

/**
 * @param {Array<{defId:string}>} einheiten Einheiten auf dem Brett
 * @returns {Array<{key:string, name:string, farbe:string, anzahl:number,
 *                  stufe:number, naechste:number|null, stufen:number[],
 *                  bonus:object|null, typ:string}>}
 */
export function berechneSynergien(einheiten) {
  const gesehen = new Set();
  const zaehler = {};
  for (const e of einheiten) {
    if (!e || gesehen.has(e.defId)) continue;
    gesehen.add(e.defId);
    const def = UNIT_BY_ID[e.defId];
    if (!def) continue;
    zaehler[def.origin] = (zaehler[def.origin] || 0) + 1;
    zaehler[def.klasse] = (zaehler[def.klasse] || 0) + 1;
  }

  const liste = [];
  for (const [key, anzahl] of Object.entries(zaehler)) {
    const t = TRAITS[key];
    if (!t) continue;
    let stufe = 0;
    for (let i = 0; i < t.stufen.length; i++) {
      if (anzahl >= t.stufen[i]) stufe = i + 1;
    }
    const naechste = stufe < t.stufen.length ? t.stufen[stufe] : null;
    liste.push({
      key, typ: t.typ, name: t.name, farbe: t.farbe, anzahl, stufe, naechste,
      stufen: t.stufen,
      bonus: stufe > 0 ? t.boni[stufe - 1] : null,
      text: stufe > 0 ? t.boni[stufe - 1].text : t.beschreibung,
    });
  }

  liste.sort((a, b) => (b.stufe - a.stufe) || (b.anzahl - a.anzahl) || a.name.localeCompare(b.name));
  return liste;
}

/** Nur die tatsächlich aktiven Synergien. */
export function aktiveSynergien(einheiten) {
  return berechneSynergien(einheiten).filter((s) => s.stufe > 0);
}

/**
 * Fasst die aktiven Boni zu einem einfachen Objekt zusammen, das die
 * Kampfsimulation direkt anwenden kann.
 */
export function synergieEffekte(einheiten) {
  const aktive = aktiveSynergien(einheiten);
  const eff = {
    global: { as: 0, sp: 0, regen: 0, startMana: 0, hp: 0, armor: 0, mr: 0 },
    proTrait: {},
    gegnerArmorMinus: 0,
    sprungTraits: new Set(),
    aktive,
  };
  for (const s of aktive) {
    const b = s.bonus;
    if (!b) continue;
    if (b.armorMinus) eff.gegnerArmorMinus += b.armorMinus;
    if (b.sprung) eff.sprungTraits.add(s.key);
    const ziel = b.ziel === 'alle' ? eff.global : (eff.proTrait[s.key] ||= { as: 0, sp: 0, regen: 0, startMana: 0, hp: 0, armor: 0, mr: 0, crit: 0, critDmg: 0, reichweite: 0 });
    for (const feld of ['as', 'sp', 'regen', 'startMana', 'hp', 'armor', 'mr', 'crit', 'critDmg', 'reichweite']) {
      if (b[feld]) ziel[feld] = (ziel[feld] || 0) + b[feld];
    }
  }
  return eff;
}
