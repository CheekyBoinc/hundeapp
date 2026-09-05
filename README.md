# Hundeapp – Trainingstagebuch für die Hundeschule

Eine kleine App für iPhone und Android. Sie läuft komplett lokal auf dem Gerät;
eine Sicherung als Datei (Einstellungen → Sicherung) deckt Handywechsel und
Weitergabe ab. Für Fortgeschrittene gibt es optional eine Synchronisierung über
ein **privates GitHub-Repo** (Einstellungen → Erweitert), in dem die Daten als
normale Datei (`daten.json`) liegen – dadurch:

- keine weiteren Konten nötig (ihr habt bereits GitHub)
- kostenlos für immer, nichts pausiert
- beide Handys gleichen sich beim Öffnen der App, beim Zurückkehren in die App
  und kurz nach jeder Änderung ab
- automatisches Backup: alle Änderungen sind als Commit in GitHub dokumentiert

## Funktionen

- Tabelle mit allen Trainingseinträgen: Datum, Ort, geübte Kommandos,
  was gemacht wurde, Übungsaufgaben von der Hundeschule, Tipps/Erklärungen der
  Trainerin und Erledigt-Häkchen
- Kommando-Lexikon mit genauer Bezeichnung und Trainer-Tipp
- Suche und Filter nach Kommando
- Synchronisierung zwischen beiden Handys über euer GitHub-Repo
- Installierbar wie eine normale App (Home-Bildschirm)

## Einrichtung (einmalig, ca. 15 Minuten)

### 1. Privates Daten-Repo anlegen

1. Auf github.com einloggen → **New repository**
2. Name: `hundeapp-daten`, Sichtbarkeit: **Private** → Create

### 2. Token erstellen (Fine-grained)

1. github.com → oben rechts **Settings → Developer settings**
2. **Personal access tokens → Fine-grained tokens → Generate new token**
3. Name z. B. `hundeapp-sync`, Ablaufmaximum z. B. 1 Jahr
4. **Repository access → Only select repositories** → `hundeapp-daten`
5. **Permissions → Contents → Read and write**
6. Token erstellen und direkt kopieren (wird nur einmal angezeigt!)

### 3. App einrichten (auf jedem Handy)

1. App öffnen → Einstellungen (Zahnrad) → Erweitert → „Einrichten“:
   - GitHub-Benutzername
   - Repo-Name: `hundeapp-daten`
   - Token aus Schritt 2
2. „Verbinden & synchronisieren“ → fertig!

Beide Handys benutzen denselben Token. Die Synchronisierung läuft dann
automatisch: beim Öffnen der App, beim Zurückkehren in die App und nach jeder
Änderung (mit kurzer Verzögerung). Der Status steht oben in der Kopfzeile
(grün = synchron, gelb = läuft, rot = Fehler).

### 4. App als Home-Bildschirm-App einrichten (beide Handys)

- **iPhone (Safari)**: App-Adresse öffnen → Teilen-Button → **Zum Home-Bildschirm**
- **Android (Chrome)**: App-Adresse öffnen → Menü (⋮) → **App installieren**

## App selbst hosten (GitHub Pages)

1. Diesen Ordner in ein **privates oder öffentliches** Repo hochladen (z. B. `hundeapp`)
   - Das Daten-Repo `hundeapp-daten` bleibt privat; der App-Code enthält keine Geheimnisse.
2. Auf github.com im Repo: **Settings → Pages → Source: GitHub Actions** wählen
3. Die mitgelieferte Workflow-Datei `.github/workflows/deploy.yml` macht den Rest –
   jede Änderung am Code wird automatisch unter `https://benutzer.github.io/hundeapp/` veröffentlicht.

## Lokal ausprobieren (Demo-Modus ohne GitHub)

```bash
npm install
npm run dev   # http://localhost:5173
```

Ohne GitHub-Verbindung speichert die App lokal im Browser („nur dieses Gerät“).
Beim ersten Start sind die vorhandenen Notizen (11.08. & 18.08.2026,
Kommando-Übersicht) bereits eingespielt.

## Sicherheit

- **Token**: Fine-grained Token, nur für das Repo `hundeapp-daten`, nur
  „Contents: Read & Write“. Er gewinnt damit **keinen** Zugriff auf andere Repos,
  Profile oder Einstellungen. Bei Verlust des Handys: Token auf GitHub einfach
  löschen (Settings → Developer settings → Personal access tokens → Delete).
- **Ablaufdatum**: Token mit Ablauf (max. 1 Jahr) anlegen und rechtzeitig
  erneuern – die App zeigt einen Sync-Fehler, wenn der Token abgelaufen ist.
- **Daten**: `daten.json` liegt im privaten Repo. Das App-Repo (für GitHub
  Pages) enthält **keine** Geheimnisse – der Token wird nur auf dem Handy
  gespeichert, nie im Code.
- **CSP**: Der Production-Build enthält eine Content-Security-Policy, die
  Verbindungen ausschließlich zur GitHub-API erlaubt.
- Die App ist für den Familiengebrauch mit 2 Geräten ausgelegt: Wer den Token
  besitzt, kann die Daten lesen und ändern. Teilt ihn nicht weiter.

## Technik

React + TypeScript + Vite (PWA), Daten als JSON-Datei in einem privaten
GitHub-Repo über die GitHub REST API (Contents API). Offline-first:
Änderungen werden lokal gespeichert und beim nächsten Kontakt synchronisiert.

## So funktioniert der Sync im Detail

- Speichern: Die App liest den aktuellen Stand aus GitHub, fügt eure Änderungen
  hinzu, und schreibt ein neues Commit („Hundeapp Sync“).
- Konflikte: Wenn ihr dasselbe Objekt gleichzeitig ändert, gewinnt immer die
  neuere Version. Unterschiedliche Objekte werden vereinigt – nichts geht verloren.
- Gelöschte Einträge bleiben als „Tombstones“ erhalten, damit keine Geräte
  nachträglich gelöschte Daten wieder hochladen.

## Android-App (Play Store)

Die App wird mit [Capacitor](https://capacitorjs.com) als native Android-App
verpackt. Voraussetzungen auf dem Mac: Android Studio (SDK) und ein JDK 21
(`brew install --cask temurin@21`; Gradle 8.14 läuft nicht mit dem JDK 25
aus Android Studio).

```bash
npm run android            # Web-Build, nach android/ kopieren, Android Studio öffnen
npm run cap:sync           # nur Web-Build + Kopieren
cd android && ./gradlew bundleRelease   # signiertes App-Bundle für den Play Store
```

Das Bundle liegt danach unter `android/app/build/outputs/bundle/release/`.
Die Signatur kommt aus `android/keystore.properties` (nicht im Repo), die auf
den Upload-Schlüssel in `~/hundeapp-signing/` zeigt. Diesen Ordner sichern!

Ein Update für den Store baut ein Befehl: `npm run release:android -- 1.1`
zählt `versionCode` hoch, setzt `versionName` auf 1.1 (Angabe optional), baut
das Web-Projekt und das signierte Bundle und legt es unter `store/` ab. Danach
die Änderung an `build.gradle` committen und das Bundle in der Play Console
hochladen. Icons und Splash-Screens erzeugt `npm run assets` aus dem
Pfoten-Icon.
