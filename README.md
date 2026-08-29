# Runenschlacht

Ein Auto-Battler (Autochess) für den Browser – reines JavaScript, keine Abhängigkeiten,
kein Build-Schritt. Das Brett wird in schräger 2.5D-Ansicht gezeichnet: eine echte
perspektivische Bodenebene, auf der stehende Figuren nach hinten kleiner werden.

## Starten

```bash
npm start          # startet einen kleinen Server auf http://localhost:8080
npm test           # Tests der Spiellogik
```

Alternativ genügt jeder statische Webserver im Projektverzeichnis.

## Spielprinzip

Acht Heerführer ziehen aus **einem gemeinsamen Einheitenpool**. Jede Runde besteht aus
einer Vorbereitungsphase und einem Kampf, der von selbst abläuft.

- **Kaufen** – fünf Ladenplätze, Preise 1–5 Gold. Drei gleiche Einheiten verschmelzen
  automatisch zu einer Zwei-Sterne-Einheit, drei davon zu drei Sternen.
- **Aufstellen** – per Ziehen auf die eigene Bretthälfte. Es dürfen so viele Einheiten
  kämpfen, wie die eigene Stufe angibt.
- **Synergien** – jede Einheit hat eine Herkunft (Wald, Untot, Zwerg, Sturm, Drache) und
  eine Klasse (Krieger, Schütze, Magier, Assassine). Genug Einheiten derselben Gruppe
  schalten Boni für das ganze Team frei.
- **Wirtschaft** – 5 Gold Grundeinkommen, bis zu 5 Gold Zinsen (1 je 10 Gold),
  Bonus für Sieges- **und** Niederlagenserien, 1 Gold extra für einen Sieg.
- **Leben** – wer einen Kampf verliert, verliert Leben: Grundschaden der Etappe plus die
  Sternstufen aller überlebenden gegnerischen Einheiten. Bei 0 scheidet man aus.

## Steuerung

| Eingabe | Wirkung |
| --- | --- |
| Ziehen | Einheit aufstellen, tauschen oder auf die Bank legen |
| Ziehen auf das rote Feld / `Entf` | Einheit verkaufen |
| `1`–`5` | Ladenplatz kaufen |
| `D` | Laden neu würfeln (2 Gold) |
| `F` | Erfahrung kaufen (4 Gold) |
| `Leertaste` | Kampf sofort beginnen |
| `S` | Kampftempo umschalten (1× / 2×) |

Mit `?seed=1234` in der Adresszeile startet eine reproduzierbare Partie.

## Aufbau

```
src/core/    Spiellogik – ohne DOM, vollständig testbar
  rng.js       deterministischer Zufall (mulberry32)
  units.js     Einheiten, Synergien, Fähigkeiten
  board.js     Brettgeometrie und Wegfindung
  traits.js    Auswertung der Synergien
  shop.js      gemeinsamer Pool, Ladenchancen, Erfahrungsstufen
  player.js    Spielerzustand: kaufen, verkaufen, aufstellen, Einkommen
  combat.js    Kampfsimulation in festen Zeitschritten
  ai.js        Gegner-KI der sieben Mitspieler
  game.js      Partieablauf: Runden, Paarungen, Ausscheiden
src/ui/      Darstellung und Eingaben
  perspektive.js  Projektion der Bodenebene (2.5D) und ihre Umkehrung
  renderer.js  Canvas-Darstellung von Brett, Figuren und Effekten
  hud.js       Laden, Synergien, Rangliste, Tooltips
  main.js      Spielschleife und Eingaben
test/        Tests der Spiellogik (node --test)
```

Die Kampfsimulation ist deterministisch: gleicher Seed und gleiche Aufstellung ergeben
immer denselben Verlauf. Die Oberfläche liest nur Zustand und verändert ihn nie – deshalb
lassen sich alle Duelle der übrigen Spieler mit derselben Simulation sofort ausrechnen.

## Hosten

Das Spiel ist rein statisch: Der Server liefert nur Dateien aus, die gesamte
Spiellogik läuft im Browser des Besuchers. Es gibt keine Datenbank, keine
Sitzungen und keinen Server-Prozess für das Spiel selbst.

| Kennzahl | Wert |
| --- | --- |
| Ausgelieferte Dateien | 15 (HTML, CSS, 12 Module) |
| Übertragung je Erstaufruf | ~130 KB roh, ~37 KB mit gzip |
| Wiederholter Aufruf | nahezu 0 (nur 304-Antworten) |
| Belegter Speicherplatz | ~220 KB |
| Arbeitsspeicher im Browser | ~2,5 MB JS-Speicher |
| Rechenzeit im Browser | ~1 ms je Bild (0,01 ms Simulation, Rest Zeichnen) |

Ein Kampf mit acht gegen acht Einheiten kostet also rund 6 % eines Kerns – gemessen
mit reiner Software-Rasterung, auf echter Hardware entsprechend weniger.

`tools/serve.js` ist nur für die Entwicklung gedacht. Für den Betrieb genügt ein
gewöhnlicher Webserver, wichtig ist allein der richtige MIME-Typ für `.js`
(ES-Module werden sonst nicht geladen):

```nginx
server {
    server_name autochess.example.de;
    root /var/www/autochess;
    index index.html;

    gzip on;
    gzip_types text/css text/javascript application/javascript;

    location ~* \.(js|css)$ { expires 7d; add_header Cache-Control "public"; }
    location / { try_files $uri $uri/ /index.html; }
}
```
