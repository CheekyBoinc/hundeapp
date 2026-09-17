# Hundeapp

Trainingstagebuch für die Hundeschule. Läuft auf iPhone und Android, komplett
auf dem Gerät. Ein Konto oder Server ist nicht nötig.

Optional gleichen sich zwei Handys über ein privates GitHub-Repo ab.

## Was die App kann

- Trainingseinträge: Datum, Ort, geübte Kommandos, Aufgaben der Hundeschule,
  Trainer-Tipps, Erledigt-Haken
- Kommando-Lexikon mit Übungsstand je Kommando
- Hundeprofil, Gewichtsverlauf mit Idealbereich, Kot-Tagebuch, Tierarztbesuche,
  Impfungen
- Kalender mit fälligen Impfungen und Folgeterminen
- Sicherung als Datei, CSV-Export und PDF-Bericht pro Hund

## Wo die Daten liegen

Alles liegt im Speicher des Geräts. Beim Abgleich schreibt die App eine
`daten.json` in ein privates GitHub-Repo. Der Zugangsschlüssel bleibt im
Schlüsselbund des Handys und steht nie im Code.

## Loslegen

```bash
npm install
npm run dev
```

Ohne GitHub-Verbindung läuft die App im Demo-Modus mit Beispieldaten.

- Abgleich einrichten: [docs/einrichtung.md](docs/einrichtung.md)
- Entwicklung und Releases: [docs/entwicklung.md](docs/entwicklung.md)
