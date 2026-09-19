# Entwicklung und Releases

## Lokal starten

```bash
npm install
npm run dev   # http://localhost:5173
```

Ohne GitHub-Verbindung speichert die App lokal im Browser. Beim ersten Start
sind Beispieldaten (11.08. und 18.08.2026, Kommando-Übersicht) eingespielt.

| Befehl | Wirkung |
| --- | --- |
| `npm run build` | Typecheck und Produktions-Build nach `dist/` |
| `npm test` | Unit-Tests mit Vitest |
| `npm run lint` | ESLint |
| `npm run assets` | Icons und Splash-Screens aus dem Pfoten-Icon |

## Technik

React, TypeScript und Vite, verpackt mit
[Capacitor](https://capacitorjs.com) als native App für Android und iOS.

Die Daten liegen im `localStorage`. Der Abgleich nutzt die GitHub Contents API
und schreibt eine Base64-kodierte `daten.json`. Zusammengeführt wird pro Objekt
nach `updated_at`. Löschungen bleiben als Tombstones erhalten, damit kein Gerät
gelöschte Einträge zurücklädt.

## Android (Play Store)

Voraussetzungen: Android Studio und JDK 21
(`brew install --cask temurin@21`; Gradle 8.14 läuft nicht mit dem JDK 25 aus
Android Studio).

```bash
npm run android            # Web-Build, nach android/ kopieren, Android Studio öffnen
npm run cap:sync           # nur Web-Build und Kopieren
```

Ein Release baut ein Befehl: `npm run release:android -- 1.3` zählt `versionCode`
hoch, setzt `versionName` auf 1.3, baut das signierte Bundle und legt es unter
`store/` ab. Danach `build.gradle` committen und das Bundle in der Play Console
hochladen.

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

## Hosten

Die mitgelieferte `.github/workflows/deploy.yml` veröffentlicht den Build über
GitHub Actions. GitHub Pages eignet sich dafür nur bei öffentlichen Repos, und
die veröffentlichte Seite ist ohnehin für jeden erreichbar. Bei einem privaten
Repo bieten Cloudflare Pages, Netlify oder Vercel das kostenlos an.
