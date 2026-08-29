/**
 * Alles, was außerhalb des Canvas dargestellt wird:
 * Laden, Synergien, Rangliste, Verlauf, Tooltip und Overlay.
 */
import { UNIT_BY_ID, TRAITS, werteFuer, faehigkeitsText, verkaufspreis } from '../core/units.js';
import { berechneSynergien } from '../core/traits.js';
import { rangliste } from '../core/game.js';
import { xpFuerNaechsteStufe, MAX_STUFE, REROLL_KOSTEN, XP_KOSTEN } from '../core/shop.js';
import { maxEinheiten, brettEinheiten } from '../core/player.js';

export const KOSTEN_FARBEN = { 1: '#9aa7b8', 2: '#5fd08a', 3: '#6fc7ff', 4: '#c88bff', 5: '#f2c76b' };

const $ = (id) => document.getElementById(id);

export function aktualisiereKopf(spiel) {
  const s = spiel.mensch;
  $('rundeText').textContent = `${spiel.plan?.etappe ?? 1}-${spiel.plan?.runde ?? 1}`;
  const phasen = { vorbereitung: 'Vorbereitung', kampf: 'Kampf', auswertung: 'Auswertung', start: 'Bereit' };
  $('phaseText').textContent = phasen[spiel.phase] || spiel.phase;
  $('lebenText').textContent = Math.max(0, s.leben);
  $('goldText').textContent = s.gold;
  $('stufeText').textContent = s.stufe;

  const schwelle = xpFuerNaechsteStufe(s.stufe);
  $('xpBalken').style.width = schwelle ? `${Math.min(100, (s.xp / schwelle) * 100)}%` : '100%';

  const rest = spiel.phase === 'vorbereitung' ? spiel.restZeit / spiel.zeitLimit : 1;
  $('timerBalken').style.width = `${Math.max(0, Math.min(1, rest)) * 100}%`;

  const duell = spiel.menschDuell;
  if (duell) {
    const name = duell.kreaturen ? duell.kreaturen.name : (duell.a === s ? duell.b?.name : duell.a.name);
    const zusatz = duell.kreaturen ? ' (Kreaturen)' : duell.geist ? ' (Abbild)' : '';
    $('gegnerAnzeige').innerHTML = `Gegner: <b>${name ?? '–'}</b>${zusatz}`;
  } else {
    $('gegnerAnzeige').textContent = 'Gegner: –';
  }

  $('rerollBtn').disabled = spiel.phase !== 'vorbereitung' || s.gold < REROLL_KOSTEN;
  $('xpBtn').disabled = spiel.phase !== 'vorbereitung' || s.gold < XP_KOSTEN || s.stufe >= MAX_STUFE;
  $('sperreBtn').classList.toggle('an', s.gesperrt);
  $('sperreZustand').textContent = s.gesperrt ? 'an' : 'aus';

  const kampfBtn = $('kampfBtn');
  const laeuft = spiel.phase !== 'vorbereitung';
  kampfBtn.classList.toggle('kampf-laeuft', laeuft);
  kampfBtn.disabled = laeuft;
  kampfBtn.firstChild.textContent = laeuft ? 'Kampf läuft …' : 'Kampf beginnen';
}

export function zeichneLaden(spiel, aufKauf, tooltip) {
  const s = spiel.mensch;
  const behaelter = $('laden');
  behaelter.innerHTML = '';
  s.laden.forEach((defId, i) => {
    const karte = document.createElement('div');
    if (!defId) {
      karte.className = 'karte leer';
      behaelter.appendChild(karte);
      return;
    }
    const def = UNIT_BY_ID[defId];
    const zuTeuer = s.gold < def.kosten;
    karte.className = `karte${zuTeuer ? ' zu-teuer' : ''}`;
    karte.style.setProperty('--kosten-farbe', KOSTEN_FARBEN[def.kosten]);

    const eigene = s.einheiten.filter((e) => e.defId === defId && e.stern === 1).length;
    const pips = [0, 1, 2].map((n) => `<i class="${n < eigene ? 'an' : ''}"></i>`).join('');

    karte.innerHTML = `
      <div class="karte-kopf"><span class="karte-glyph">${def.glyph}</span><span class="karte-name">${def.name}</span></div>
      <div class="karte-traits"><span>${TRAITS[def.origin].name}</span><span>${TRAITS[def.klasse].name}</span></div>
      <div class="karte-fuss">
        <span class="karte-preis">${def.kosten} ◈</span>
        <span class="karte-fortschritt">${pips}</span>
      </div>`;
    karte.addEventListener('click', () => aufKauf(i));
    karte.addEventListener('mouseenter', (ev) => tooltip.zeige(einheitTooltip(def, 1), ev));
    karte.addEventListener('mousemove', (ev) => tooltip.bewege(ev));
    karte.addEventListener('mouseleave', () => tooltip.verstecke());
    behaelter.appendChild(karte);
  });
}

export function zeichneSynergien(spiel, tooltip) {
  const brett = brettEinheiten(spiel.mensch);
  const liste = berechneSynergien(brett);
  const behaelter = $('synergien');
  behaelter.innerHTML = '';
  if (!liste.length) {
    behaelter.innerHTML = '<div class="syn-leer">Stelle Einheiten auf dem Brett auf, um Synergien zu wecken.</div>';
    return;
  }
  for (const s of liste) {
    const el = document.createElement('div');
    el.className = `syn${s.stufe > 0 ? ' aktiv' : ''}`;
    el.style.setProperty('--farbe', s.farbe);
    const stufenText = s.stufen.map((n) => (s.anzahl >= n ? `<b>${n}</b>` : n)).join(' · ');
    el.innerHTML = `
      <span class="syn-glyph">${s.anzahl}</span>
      <span class="syn-name">${s.name}</span>
      <span class="syn-stufen">${stufenText}</span>`;
    el.addEventListener('mouseenter', (ev) => tooltip.zeige(synergieTooltip(s), ev));
    el.addEventListener('mousemove', (ev) => tooltip.bewege(ev));
    el.addEventListener('mouseleave', () => tooltip.verstecke());
    behaelter.appendChild(el);
  }
}

export function zeichneRangliste(spiel) {
  const behaelter = $('rangliste');
  behaelter.innerHTML = '';
  for (const eintrag of rangliste(spiel)) {
    const s = eintrag.spieler;
    const el = document.createElement('div');
    el.className = `rang${s.istMensch ? ' ich' : ''}${s.tot ? ' tot' : ''}`;
    el.style.borderLeftColor = s.farbe;
    const serie = eintrag.streak !== 0
      ? `<span class="rang-streak">${eintrag.streak > 0 ? '▲' : '▼'}${Math.abs(eintrag.streak)}</span>` : '';
    el.innerHTML = `
      <span></span>
      <span class="rang-name">${s.name} <small>St. ${eintrag.stufe}</small> ${serie}</span>
      <span class="rang-leben" style="color:${s.tot ? 'var(--text-leise)' : lebenFarbe(eintrag.leben)}">${s.tot ? `#${s.platz}` : eintrag.leben}</span>
      <span class="rang-syn">${eintrag.synergien.map((y) => `<span style="color:${y.farbe}">${y.anzahl} ${y.name}</span>`).join('')}</span>`;
    behaelter.appendChild(el);
  }
}

function lebenFarbe(leben) {
  if (leben > 60) return '#6fe0a0';
  if (leben > 30) return '#f2c76b';
  return '#ff6b7a';
}

export function zeichneLog(spiel) {
  const behaelter = $('log');
  behaelter.innerHTML = '';
  for (const e of spiel.log.slice(0, 30)) {
    const el = document.createElement('div');
    el.className = `log-eintrag${e.art ? ' ' + e.art : ''}`;
    el.textContent = e.text;
    behaelter.appendChild(el);
  }
}

// ------------------------------------------------------------ Tooltip

export function erstelleTooltip() {
  const el = $('tooltip');
  return {
    zeige(html, ev) {
      el.innerHTML = html;
      el.classList.remove('versteckt');
      this.bewege(ev);
    },
    bewege(ev) {
      if (!ev) return;
      const r = el.getBoundingClientRect();
      let x = ev.clientX + 16;
      let y = ev.clientY + 16;
      if (x + r.width > window.innerWidth - 10) x = ev.clientX - r.width - 16;
      if (y + r.height > window.innerHeight - 10) y = ev.clientY - r.height - 16;
      el.style.left = `${Math.max(8, x)}px`;
      el.style.top = `${Math.max(8, y)}px`;
    },
    verstecke() { el.classList.add('versteckt'); },
  };
}

export function einheitTooltip(def, stern = 1, zusatz = '') {
  const w = werteFuer(def, stern);
  const sterne = '★'.repeat(stern);
  return `
    <h4><span>${def.glyph}</span> ${def.name} <span style="color:${stern >= 3 ? '#ffd479' : '#e6e6e6'};font-size:12px">${sterne}</span></h4>
    <div class="tt-traits">${TRAITS[def.origin].name} · ${TRAITS[def.klasse].name} · <span style="color:${KOSTEN_FARBEN[def.kosten]}">${def.kosten} ◈</span></div>
    <div class="tt-werte">
      <div>Leben <b>${w.hp}</b></div>
      <div>Angriff <b>${w.ad}</b></div>
      <div>Tempo <b>${w.as.toFixed(2)}/s</b></div>
      <div>Reichweite <b>${w.reichweite}</b></div>
      <div>Rüstung <b>${w.armor}</b></div>
      <div>Magieres. <b>${w.mr}</b></div>
    </div>
    <div class="tt-faehig"><b>${def.faehigkeit.name}</b> <span style="color:#5aa8ff">(${w.mana} Mana)</span>
      <div class="tt-text">${faehigkeitsText(def, stern)}</div>
    </div>
    ${zusatz}`;
}

export function synergieTooltip(s) {
  const t = TRAITS[s.key];
  const zeilen = t.stufen.map((n, i) => {
    const aktiv = s.anzahl >= n;
    return `<div style="color:${aktiv ? s.farbe : 'var(--text-leise)'};margin-top:3px">
      <b>${n}</b> – ${t.boni[i].text}</div>`;
  }).join('');
  return `
    <h4 style="color:${s.farbe}">${s.name} <span style="font-size:12px;color:var(--text-leise)">${s.anzahl} Einheiten</span></h4>
    <div class="tt-text">${t.beschreibung}</div>
    <div class="tt-faehig" style="margin-top:6px">${zeilen}</div>`;
}

// ------------------------------------------------------------ Overlay

export function zeigeOverlay({ titel, text, details = [], knopfText = 'Neue Partie', aufKnopf }) {
  $('overlayTitel').textContent = titel;
  $('overlayText').innerHTML = text;
  const d = $('overlayDetails');
  d.innerHTML = details.map((z) => `<div class="zeile"><span>${z.links}</span><b>${z.rechts}</b></div>`).join('');
  const btn = $('overlayBtn');
  btn.textContent = knopfText;
  btn.onclick = aufKnopf;
  $('overlay').classList.remove('versteckt');
}

export function versteckeOverlay() {
  $('overlay').classList.add('versteckt');
}

export function zeigeBanner(text, art) {
  const el = $('kampfBanner');
  el.textContent = text;
  el.className = `kampf-banner ${art}`;
  // Animation neu starten
  void el.offsetWidth;
  el.classList.remove('versteckt');
  setTimeout(() => el.classList.add('versteckt'), 1000);
}
