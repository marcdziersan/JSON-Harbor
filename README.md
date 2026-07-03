# ⚓ JSON Harbor

**JSON Harbor** ist ein browserbasiertes Lernspiel für JSON-Grundlagen, Schema-Denken, Validierungsregeln und erwartete Ausgabeformate.

Der Spieler übernimmt die Rolle eines Hafen-Inspektors. Eingehende Schiffe bringen beschädigte JSON-Manifeste. Jede Mission muss repariert werden, bis Parsing, Schema-Prüfung, Custom Rules oder erwartete Zielstruktur passen.

---

## Status

**Version:** 0.3.0 Refactoring Release  
**Projektart:** Lernprojekt / Portfolio-Projekt  
**Technik:** HTML5, CSS3, Vanilla JavaScript, JSON, localStorage  
**Abhängigkeiten:** keine externen Libraries, kein Build-Tool, kein Framework

---

## Warum dieses Projekt existiert

JSON wirkt am Anfang oft einfach: geschweifte Klammern, Doppelpunkte, Arrays, fertig.

In echten Anwendungen reicht das aber nicht. Dort muss JSON:

- syntaktisch korrekt sein,
- passende Datentypen verwenden,
- Pflichtfelder enthalten,
- keine unerlaubten Zusatzfelder enthalten,
- Listenregeln einhalten,
- und teilweise exakt in ein erwartetes Ausgabeformat transformiert werden.

JSON Harbor macht diese Punkte spielerisch sichtbar. Statt nur Regeln zu lesen, repariert man konkrete JSON-Payloads Schritt für Schritt.

---

## Funktionen

- interaktives JSON-Lernspiel im Browser
- 5 Docks mit je 5 Missionen
- progressive Freischaltung: Missionen werden nacheinander gelöst
- Story-Overlays für Dock- und Missionsfortschritt
- JSON-Editor mit Reset und Validierung
- Tastenkürzel `Ctrl + Enter` zum Validieren
- Fortschrittsspeicherung per `localStorage`
- automatischer Reset nach vollständigem Abschluss
- Compendium als Nachschlagewerk
- Suchfunktion im Compendium
- eigene JSON-Validierungslogik ohne externe Library
- Expected-Output-Vergleich für Transformationsaufgaben

---

## Lerninhalte

| Dock | Thema | Inhalt |
|---|---|---|
| Dock 1 | Syntax & Basics | Quotes, Kommata, Objekt/Array, gültiges JSON |
| Dock 2 | Types & Required Fields | Integer, Number, Boolean, Null, Pflichtfelder |
| Dock 3 | Structure & Additional Properties | Verschachtelung, erlaubte Felder, Objekt-/Array-Struktur |
| Dock 4 | Lists & Rules | Min/Max Items, Unique Keys, Enum, Stringlängen |
| Dock 5 | Transform & Expected Output | Ausgabe exakt nach Zielstruktur bauen |

---

## Technischer Stack

| Bereich | Technik |
|---|---|
| Markup | HTML5 |
| Styling | CSS3, mobile-first, responsive Layout |
| Logik | Vanilla JavaScript |
| Daten | JSON-Dateien |
| Speicherung | Browser `localStorage` |
| Hosting | statisch möglich, z. B. GitHub Pages, Apache, Nginx |

---

## Projektstruktur

```txt
JSON-Harbor/
├── index.html                 # Compendium / Lernreferenz
├── game.html                  # Spieloberfläche
├── README.md                  # Projektdokumentation
├── LICENSE                    # MIT-Lizenz
│
├── assets/
│   └── images/
│       └── wall.png           # Hintergrundbild
│
├── css/
│   ├── kstyle.css             # Compendium-Layout
│   └── style.css              # Spiel-Layout
│
├── js/
│   ├── config.js              # zentrale Pfade und Version
│   ├── utils.js               # DOM-, Escape-, Fetch- und Format-Helfer
│   ├── storage.js             # Fortschritt und localStorage
│   ├── validator.js           # Parser, Schema- und Rule-Validator
│   ├── comparator.js          # Deep-Compare und Diff für Expected Output
│   ├── engine.js              # Spielsteuerung
│   ├── compendium.js          # Compendium-Rendering und Suche
│   ├── kscript.json           # Compendium-Inhalte
│   └── missions/
│       ├── missions.json      # Dock- und Missionsindex
│       ├── 01/                # Dock 1 Missionen
│       ├── 02/                # Dock 2 Missionen
│       ├── 03/                # Dock 3 Missionen
│       ├── 04/                # Dock 4 Missionen
│       └── 05/                # Dock 5 Missionen
│
└── tools/
    └── check-missions.mjs     # optionale Strukturprüfung per Node.js
```

---

## Starten

Da die Anwendung JSON-Dateien per `fetch()` lädt, sollte sie über einen lokalen Webserver gestartet werden. Direktes Öffnen per `file://` kann je nach Browser blockiert werden.

### Variante 1: Python

```bash
python -m http.server 8080
```

Danach öffnen:

```txt
http://localhost:8080/
```

### Variante 2: PHP

```bash
php -S localhost:8080
```

Danach öffnen:

```txt
http://localhost:8080/
```

### Variante 3: GitHub Pages

Repository veröffentlichen und GitHub Pages auf Branch `main` / Root aktivieren. Die Seite ist vollständig statisch und benötigt keinen Servercode.

---

## Bedienung

1. `index.html` öffnen, um das Compendium zu lesen.
2. Über **Start Game** die Spieloberfläche öffnen.
3. JSON im Editor korrigieren.
4. Mit **Validate** oder `Ctrl + Enter` prüfen.
5. Nach erfolgreicher Mission wird die nächste Mission freigeschaltet.

Der Fortschritt wird im Browser gespeichert. Nach Abschluss aller Docks kann das Spiel neu gestartet werden.

---

## Mission-Format

Eine Mission ist eine JSON-Datei mit Eingabe und Prüfdefinition.

### Beispiel: Schema-Mission

```json
{
  "id": "dock1-01",
  "title": "Broken Manifest",
  "description": "Repair the JSON so it becomes valid and matches the schema.",
  "input": "{ \"id\": 1, name: \"Container\" }",
  "schema": {
    "type": "object",
    "required": ["id", "name"],
    "properties": {
      "id": { "type": "integer" },
      "name": { "type": "string" }
    },
    "additionalProperties": false
  }
}
```

### Unterstützte Schema-Elemente

- `type`: `object`, `array`, `string`, `integer`, `number`, `boolean`, `null`
- `required`
- `properties`
- `additionalProperties: false`
- `items`
- `minItems`, `maxItems`
- `minLength`, `maxLength`
- `minimum`, `maximum`
- `enum`
- `pattern`

### Unterstützte Custom Rules

- `enum`
- `minItems`
- `maxItems`
- `unique`
- `stringLength`

### Expected Output

Dock 5 nutzt `expected`, um die reparierte oder transformierte JSON-Struktur exakt gegen ein Zielobjekt zu prüfen.

```json
{
  "input": "{ \"dock\": 5, \"grade\": \"A\" }",
  "expected": {
    "cleared": true,
    "report": {
      "dock": 5,
      "grade": "A"
    }
  }
}
```

---

## Refactoring in Version 0.3.0

Diese Version wurde strukturell überarbeitet.

### Vorher

- viel Logik direkt in wenigen großen Dateien
- Compendium-Logik inline in `index.html`
- Fortschritt, UI, Validierung und Spielablauf stärker vermischt
- erwarteter Output gab nur eine allgemeine Fehlermeldung aus

### Jetzt

- zentrale Konfiguration in `js/config.js`
- gemeinsame Hilfsfunktionen in `js/utils.js`
- Fortschrittsspeicherung ausgelagert in `js/storage.js`
- Compendium-Rendering ausgelagert in `js/compendium.js`
- Spielsteuerung konzentriert in `js/engine.js`
- Validator erweitert und defensiver gemacht
- Comparator liefert jetzt konkrete Diff-Hinweise mit Pfad
- HTML-Seiten sind schlanker und semantischer
- CSS wurde mobile-first neu sortiert
- optionale Missionsprüfung per `tools/check-missions.mjs`

---

## Missionsprüfung

Optional kann die Missionsstruktur mit Node.js geprüft werden:

```bash
node tools/check-missions.mjs
```

Die Prüfung kontrolliert:

- Existenz von Docks und Missionen
- doppelte Mission-IDs
- Vollständigkeit der Missionsreferenzen
- vorhandene Missionsdateien
- `input` als String
- mindestens eine Prüfdefinition pro Mission (`schema`, `rules` oder `expected`)

---

## Erweiterungsideen

- weitere Docks für REST-API-Responses
- Level-Editor für eigene Missionen
- Export/Import von Fortschritt
- optionaler Lösungsmodus für Dozenten oder Lernbegleitung
- Mehrsprachigkeit Deutsch/Englisch
- kleine Test-Suite für Validator und Comparator

---

## Grenzen

JSON Harbor implementiert bewusst nur einen kompakten, lernorientierten Ausschnitt von JSON-Schema-Prüfungen. Es ersetzt keine vollständige JSON-Schema-Library wie Ajv.

Das ist Absicht: Ziel ist Nachvollziehbarkeit, nicht maximale Normabdeckung.

---

## Autor

Marcus Dziersan  
GitHub: [marcdziersan](https://github.com/marcdziersan)

---

## Lizenz

Dieses Projekt steht unter der MIT-Lizenz. Details siehe [`LICENSE`](./LICENSE).
