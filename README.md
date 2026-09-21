# Hundeapp

Trainingstagebuch für die Hundeschule. Läuft auf iPhone und Android, die Daten
liegen auf dem Gerät.

Auf Wunsch gleichen sich zwei Geräte ab: über ein Konto (Anmeldung per
E-Mail-Code, in der Einführungsphase kostenlos) oder über ein eigenes privates
GitHub-Repo.

## Was die App kann

- Trainingseinträge: Datum, Ort, geübte Kommandos, Aufgaben der Hundeschule,
  Trainer-Tipps, Erledigt-Haken
- Kommando-Lexikon mit Übungsstand je Kommando
- Hundeprofil, Gewichtsverlauf mit Idealbereich, Kot-Tagebuch, Tierarztbesuche,
  Impfungen
- Kalender mit fälligen Impfungen und Folgeterminen
- Sicherung als Datei, CSV-Export und PDF-Bericht pro Hund

## Wo die Daten liegen

Alles liegt im Speicher des Geräts. Beim Abgleich kommt der gesamte Stand
zusätzlich auf einen Server des Anbieters (E-Mail-Adresse und Einträge, damit
sich die Geräte abgleichen können) oder in ein eigenes privates GitHub-Repo.
Zugangsschlüssel und Sitzung bleiben im Schlüsselbund des Handys und stehen nie
im Code.

## Loslegen

```bash
npm install
npm run dev
```

Ohne eingerichteten Abgleich läuft die App zunächst mit Beispieldaten; sie
lassen sich auf der Einträge-Seite mit einem Tipp entfernen.

- Abgleich einrichten: [docs/einrichtung.md](docs/einrichtung.md)
- Entwicklung und Releases: [docs/entwicklung.md](docs/entwicklung.md)
