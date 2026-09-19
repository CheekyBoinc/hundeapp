# Abgleich zwischen zwei Handys einrichten

Der Abgleich ist optional. Ohne ihn speichert die App nur lokal auf dem Gerät.
Mit Abgleich schreibt sie den gesamten Stand als `daten.json` in ein privates
GitHub-Repo. Beide Handys benutzen dasselbe Repo und denselben Token.

Zeitaufwand: etwa 15 Minuten, einmal pro Handy.

## 1. Privates Daten-Repo anlegen

1. Auf github.com einloggen → **New repository**
2. Name: `hundeapp-daten`
3. Sichtbarkeit: **Private**
4. **Create repository**

## 2. Token erstellen (fine-grained)

1. github.com → oben rechts **Settings → Developer settings**
2. **Personal access tokens → Fine-grained tokens → Generate new token**
3. Name: `hundeapp-sync`, Ablauf z. B. 1 Jahr
4. **Repository access → Only select repositories** → `hundeapp-daten`
5. **Permissions → Contents → Read and write**
6. Token erzeugen und sofort kopieren. Er wird nur einmal angezeigt.

## 3. App einrichten (auf jedem Handy)

1. App öffnen → Einstellungen (Zahnrad) → **Erweitert** → **Einrichten**
2. GitHub-Benutzername, Repo-Name `hundeapp-daten` und den Token eintragen
3. **Verbinden & synchronisieren**

Der Status steht oben in der Kopfzeile: grün = synchron, gelb = läuft, rot = Fehler.

Der Abgleich läuft von selbst, beim Öffnen der App, beim Zurückkehren in die App
und kurz nach jeder Änderung.

## Sicherheit

- Der Token gilt nur für das Repo `hundeapp-daten` und darf dort nur Inhalte
  lesen und schreiben. Er öffnet keine anderen Repos und kein Profil.
- Bei Verlust des Handys den Token auf GitHub löschen:
  **Settings → Developer settings → Personal access tokens**.
- Läuft der Token ab, zeigt die App einen Sync-Fehler. Danach einen neuen
  erstellen und in der App eintragen.
- Wer den Token hat, kann die Daten lesen und ändern. Die App ist für zwei
  Geräte gedacht, den Token also nicht weitergeben.
