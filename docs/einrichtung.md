# Abgleich zwischen Geräten einrichten

Der Abgleich ist optional. Ohne ihn speichert die App nur lokal auf dem Gerät.
Es gibt zwei Wege:

| Weg | Für wen | Aufwand |
| --- | --- | --- |
| **Hundeapp-Sync** | alle | zwei Minuten, Konto per E-Mail-Code |
| **Eigenes GitHub-Repo** | Fortgeschrittene | etwa 15 Minuten, eigener Token |

Es ist immer genau ein Weg aktiv. Ein Wechsel ist jederzeit möglich; die Daten
auf dem Gerät bleiben dabei erhalten und werden beim nächsten Abgleich
zusammengeführt.

## Weg 1: Hundeapp-Sync

1. App öffnen → Einstellungen (Zahnrad) → **Abgleich zwischen Geräten**
2. Bei **Hundeapp-Sync** auf **Verbinden**
3. E-Mail-Adresse eingeben → **Code senden**
4. Den sechsstelligen Code aus der Mail eintragen → **Verbinden**
5. Auf jedem weiteren Gerät dasselbe mit derselben Adresse

Der Dienst ist in der Einführungsphase kostenlos. Konto und gespeicherter Stand
lassen sich jederzeit über **Konto löschen** entfernen; die Einträge auf dem
Gerät bleiben dabei erhalten.

## Weg 2: Eigenes GitHub-Repo

### 1. Privates Daten-Repo anlegen

1. Auf github.com einloggen → **New repository**
2. Name: `hundeapp-daten`
3. Sichtbarkeit: **Private**
4. **Create repository**

### 2. Token erstellen (fine-grained)

1. github.com → oben rechts **Settings → Developer settings**
2. **Personal access tokens → Fine-grained tokens → Generate new token**
3. Name: `hundeapp-sync`, Ablauf z. B. 1 Jahr
4. **Repository access → Only select repositories** → `hundeapp-daten`
5. **Permissions → Contents → Read and write**
6. Token erzeugen und sofort kopieren. Er wird nur einmal angezeigt.

### 3. App einrichten (auf jedem Handy)

1. App öffnen → Einstellungen (Zahnrad) → **Abgleich zwischen Geräten**
2. Bei **Eigenes GitHub-Repo** auf **Einrichten**
3. GitHub-Benutzername, Repo-Name `hundeapp-daten` und den Token eintragen
4. **Verbinden & synchronisieren**

## In beiden Fällen

Der Status steht oben in der Kopfzeile: grün = abgeglichen, gelb = läuft,
rot = Fehler.

Der Abgleich läuft von selbst, beim Öffnen der App, beim Zurückkehren in die App
und kurz nach jeder Änderung.

## Sicherheit

**Hundeapp-Sync**

- Gespeichert werden die E-Mail-Adresse und der gesamte Stand der App, damit sich
  die Geräte abgleichen können. Einzelheiten in der
  [Datenschutzerklärung](https://cheekyboinc.github.io/hundeapp/datenschutz.html).
- Die Anmeldung erfolgt ohne Passwort über einen Code per E-Mail. Für die Prüfkonten der Stores
  ist der Umschalter für die Passwort-Anmeldung im Sync-Dialog versteckt: fünfmal auf die
  Überschrift tippen.
- Konto löschen: Einstellungen → Abgleich zwischen Geräten → **Konto löschen**.

**Eigenes GitHub-Repo**

- Der Token gilt nur für das Repo `hundeapp-daten` und darf dort nur Inhalte
  lesen und schreiben. Er öffnet keine anderen Repos und kein Profil.
- Bei Verlust des Handys den Token auf GitHub löschen:
  **Settings → Developer settings → Personal access tokens**.
- Läuft der Token ab, zeigt die App einen Sync-Fehler. Danach einen neuen
  erstellen und in der App eintragen.
- Wer den Token hat, kann die Daten lesen und ändern. Die App ist für zwei
  Geräte gedacht, den Token also nicht weitergeben.
