# Entwicklung und Releases

## Lokal starten

```bash
npm install
npm run dev   # http://localhost:5173
```

Ohne eingerichteten Abgleich speichert die App nur auf dem Gerät. Beim ersten
Start sind Beispieldaten eingespielt (zwei Trainingseinträge von vor einer und
vor zwei Wochen, dazu die Kommando-Übersicht).

| Befehl           | Wirkung                                                     |
| ---------------- | ----------------------------------------------------------- |
| `npm run build`  | Typecheck und Produktions-Build nach `dist/`                |
| `npm test`       | Unit-Tests mit Vitest                                       |
| `npm run lint`   | ESLint                                                      |
| `npm run assets` | Icons und Splash-Screens aus dem Pfoten-Icon                |
| `npm run icons`  | Icons, Splash-Bilder und Store-Grafiken aus dem Pfoten-Icon |
| `npm run texts`  | Sichtbare Texte der Oberfläche als JSON ausgeben            |

`npm run assets` bleibt bewusst außerhalb der Abhängigkeiten: Das Werkzeug von
Capacitor zieht einen alten Abhängigkeitsbaum mit. Stattdessen ist seine Version
im Skript festgenagelt (3.0.5); der Aufruf holt sie bei Bedarf aus der Registry.

## Zugangsdaten des Sync-Dienstes

Der Abgleich über den Dienst läuft über ein Supabase-Projekt. Zwei Werte landen
im Build und stehen deshalb in `.env` (nicht im Repo):

```
VITE_SUPABASE_URL=https://<projekt>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_…
VITE_CLOUD_SYNC=1
```

Der Schlüssel ist öffentlich gedacht und für den Client bestimmt; die
Zugriffsregeln schützen die Daten. Der **Secret-Key** (`sb_secret_…`) gehört
ausschließlich in die Supabase-Secrets und niemals in die App; die
Serverfunktionen lesen ihn dort aus `SUPABASE_SERVICE_ROLE_KEY`.

Das Repo ist öffentlich (GitHub Pages braucht das für die Rechtsseiten).
Persönliche Notizen, Zugangsdaten und Schlüssel gehören deshalb nicht hinein –
sie liegen außerhalb des Repos, zum Beispiel in `~/hundeapp-signing/`.

Ohne `VITE_CLOUD_SYNC=1` erscheint der Dienst nirgends in der Oberfläche – der
Weg über GitHub bleibt unberührt.

Der Dienst selbst (Tabellen, Regeln, Serverfunktionen) wird mit
`npx supabase@latest db push` und `npx supabase@latest functions deploy`
ausgerollt; `supabase/test-sync.sh` prüft ihn anschließend von außen: Konto und
Freischaltung, Schreiben mit Revisionsprüfung, Lesen ohne Freischaltung, das
Größenlimit, die Erreichbarkeit der `health`-Funktion und das Löschen des
Kontos. Ein Abbruch räumt das Testkonto auf.

### Anmeldemails

Die Anmeldung läuft über einen sechsstelligen Code per E-Mail, nicht über
einen Link. Dafür müssen im Supabase-Dashboard **beide** Vorlagen auf den Code
umgestellt sein, denn Supabase wählt sie danach aus, ob das Konto neu ist:

| Vorlage        | Verwendung        |
| -------------- | ----------------- |
| Confirm signup | neues Konto       |
| Magic link     | bestehendes Konto |

Beide enthalten `{{ .Token }}`; die Länge steht unter Authentication → Providers
(6 Ziffern). Der Mailversand läuft über das eigene Postfach (SMTP), nicht über
den eingebauten Versand von Supabase.

## Technik

React, TypeScript und Vite, verpackt mit
[Capacitor](https://capacitorjs.com) als native App für Android und iOS.

Die Daten liegen im `localStorage`. Für den Abgleich gibt es zwei Wege hinter
derselben Schnittstelle in `src/sync/`: das eigene private GitHub-Repo (Contents
API, Base64-kodierte `daten.json`) oder den Dienst (Supabase, Tabelle
`sync_state` mit Revisionsnummer). Zusammengeführt wird pro Objekt nach
`updated_at`. Löschungen bleiben als Tombstones erhalten, damit kein Gerät
gelöschte Einträge zurücklädt.

### Neue Felder im Datenmodell

Neue Felder an bestehenden Datensätzen sind immer optional, flach und ohne neue
Sammlungen. Der Abgleich reicht unbekannte einfache Werte (Text, Zahl,
Wahrheitswert, null) durch, damit neuere Geräte nichts verlieren. Texte bleiben
dabei unter 20.000 Zeichen: Längere unbekannte Werte kappt der Abgleich, und die
Prüfung beim Einspielen würde sonst den ganzen Datensatz verwerfen. Wer ein
längeres Feld braucht wie `photo` beim Hund, muss es in `clean*` prüfen und in
`plausibleRecord` (`src/backup.ts`) von der Längengrenze ausnehmen — dann müssen
alle Geräte die neue Version haben.

### Test-Erinnerung

`VITE_DEBUG_REMINDERS=1 npm run dev` (nur auf der Kommandozeile, nie in `.env`)
blendet in den Einstellungen „Test-Erinnerung in 1 Minute" ein. Der Schalter gilt
nur außerhalb von Produktions-Builds: Das Release-Skript prüft alle `.env*`-Dateien,
und `npm run build` bricht ab, wenn die Variable gesetzt ist. Für iOS gilt
dieselbe Regel — vor dem Archivieren prüfen, dass die Variable nicht gesetzt ist.

### Plugins

Erinnerungen kommen von `@capacitor/local-notifications`, der Bewertungsdialog
von `@capacitor-community/in-app-review`. Nach jedem neuen Plugin einmal
`npx cap sync` für beide Plattformen laufen lassen, sonst fehlt es im
iOS-Projekt. Erinnerungen werden bewusst ohne exakte Alarme geplant
(`isExactNotification: false`) und mit `allowWhileIdle: true`, damit Android
nicht nach der Erlaubnis für „Wecker und Erinnerungen" fragt.

## Bekannte Meldung von npm audit

`npm audit` meldet eine Schwachstelle in `uuid` über `@capacitor/cli` und
`xcode` (GHSA-w5hq-g745-h8pq). Betroffen ist nur das lokale Entwicklerwerkzeug,
kein Code davon landet in der App; bis Capacitor das auflöst, bleibt der
Eintrag bewusst stehen.

## Android (Play Store)

Voraussetzungen: Android Studio und JDK 21
(`brew install --cask temurin@21`; Gradle 8.14 läuft nicht mit dem JDK 25 aus
Android Studio).

```bash
npm run android            # Web-Build, nach android/ kopieren, Android Studio öffnen
npm run cap:sync           # nur Web-Build und Kopieren
```

Ein Release baut ein Befehl: `npm run release:android -- 1.4.5` zählt `versionCode`
hoch, setzt `versionName` auf 1.4.5, gleicht `package.json` und das iOS-Projekt
an, baut das signierte Bundle und legt es unter `store/` ab. Danach das Bundle
in der Play Console hochladen und den Versionssprung committen.

Die Signatur kommt aus `android/keystore.properties`, die auf den
Upload-Schlüssel in `~/hundeapp-signing/` zeigt. Beide liegen nicht im Repo und
gehören gesichert.

## iOS (App Store und TestFlight)

Voraussetzungen: Xcode aus dem Mac App Store, einmal geöffnet, und als
Kommandozeilen-Xcode gesetzt:

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
```

```bash
npm run ios     # Web-Build, nach ios/ kopieren, Xcode öffnen
```

Einmalig einrichten:

1. Xcode → **Settings → Accounts** → Apple-ID hinzufügen
2. Im Projekt unter **Signing & Capabilities** das Team wählen.
   „Automatically manage signing“ bleibt aktiv.
3. Am iPhone **Einstellungen → Datenschutz & Sicherheit → Entwicklermodus**
   einschalten und das iPhone neu starten.
4. iPhone per Kabel anschließen und einmal von Xcode benutzen. Erst dadurch
   trägt Apple das Gerät im Team ein und stellt die Profile aus. Ohne
   registriertes Gerät bricht der Archive-Build mit
   „No profiles for … were found“ ab.

Release:

1. Als Ziel **Any iOS Device (arm64)** wählen
2. **Product → Archive**
3. Im Organizer **Distribute App → App Store Connect → Upload**
4. In App Store Connect unter **TestFlight** eine interne Testgruppe anlegen,
   Tester hinzufügen und den Build auswählen

Version und Build stehen in `ios/App/App.xcodeproj/project.pbxproj`. Das Paket
nutzt Swift Package Manager, CocoaPods ist nicht nötig.

## Rechtsseiten und Hosting

Die Web-Fassung der App wird nicht mehr weiterentwickelt. Der Workflow
`.github/workflows/deploy.yml` prüft bei jedem Push Lint, Tests und Build und
veröffentlicht danach nur noch `site/`: Startseite, Datenschutz,
Nutzungsbedingungen und Kontolöschung. Diese Seiten müssen erreichbar bleiben,
weil beide Stores sie verlangen. GitHub Pages braucht dafür ein öffentliches
Repo; soll das Repo privat werden, veröffentlicht `site/` stattdessen über
Cloudflare Pages, Netlify oder Vercel.
