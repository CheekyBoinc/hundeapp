# Hundeapp-Ausbau

**Status:** Entwurf zur Bewertung  
**Ziel:** Eine zuverlässige, mobile und möglichst wartungsarme Hundeapp für iPhone und Android.

## 1. Ausgangslage

- App: React, TypeScript, Vite und PWA
- Öffentliches App-Repo: `CheekyBoinc/hundeapp`
- Privates Daten-Repo: `CheekyBoinc/hundeapp-daten`
- Hosting: GitHub Pages
- Synchronisierung: GitHub Contents API über `daten.json`
- Lokaler Demo-Modus ohne Konto ist vorhanden
- Aktuelle Live-Adresse: `https://cheekyboinc.github.io/hundeapp/`


- Der GitHub-Token liegt im Browser-`localStorage`.
- Eine installierte PWA hat aktuell `start_url: "/"`, obwohl die App unter `/hundeapp/` liegt.
- Das Einrichtungsformular erzwingt nicht, dass das Daten-Repo privat ist.
- GitHub-Konflikte beim gleichzeitigen Speichern werden noch nicht zuverlässig wiederholt.
- Geänderte oder gelöschte Daten bleiben in der Git-Commit-Historie erhalten.
- Die Struktur von `daten.json` wird nicht vollständig validiert.
- GitHub-Actions sind nicht auf feste Commit-SHAs gepinnt.
- Positiv: keine bekannten XSS-Sinks, keine Geheimnisse im App-Repo und `npm audit` meldet aktuell keine bekannten Schwachstellen.


### Variante A: GitHub beibehalten

Empfohlen für normale Hundeschulnotizen ohne besonders sensible Daten.

- Keine zusätzliche Infrastruktur
- Keine weiteren Konten nötig
- Daten-Repo bleibt privat
- Fine-grained Token nur für `hundeapp-daten`
- Sync ist beim Öffnen, beim Speichern und beim Zurückkehren in die App möglich

### Variante B: Später auf Backend/OAuth wechseln

Empfohlen, falls später Adressen, Gesundheitsdaten, private Kontaktdaten oder andere sensible Informationen gespeichert werden.

- Token liegt nicht im Browser
- Bessere Benutzer- und Geräteverwaltung
- Mehr Aufwand und laufende technische Infrastruktur
- Mögliche Plattformen: Firebase, Supabase oder ein eigener kleiner Server

**Vorschlag:** Zunächst Variante A sicher härten. Vor sensiblen Daten eine neue Architekturentscheidung treffen.


### Phase 0: Regeln festlegen

**Priorität:** P0, vor der täglichen Nutzung  
**Ergebnis:** Klare Sicherheits- und Betriebsregeln

- Festlegen, dass `hundeapp-daten` immer privat bleibt.
- Ausschließlich Fine-grained Tokens verwenden.
- Token-Berechtigung auf `Contents: Read and write` für genau ein Daten-Repo begrenzen.
- Token mit Ablaufdatum und maximal einjähriger Laufzeit verwenden.
- GitHub-Konto mit 2FA oder Passkey schützen.
- Entscheiden, ob normale Hundeschulnotizen ohne Verschlüsselung ausreichen.
- Festlegen, wie ein Token bei Handyverlust oder Verdacht auf Missbrauch widerrufen wird.


**Priorität:** P0  
**Geschätzter Aufwand:** 2–4 Stunden  
**Ergebnis:** Sichere Grundeinrichtung und korrekt installierbare PWA

- PWA-`start_url` auf `./` ändern und `scope` prüfen.
- Installation auf iPhone Safari und Android Chrome testen.
- Einrichtungsprüfung erweitern:
  - Repo muss privat sein.
  - Repo muss erreichbar sein.
  - Schreibberechtigung muss vorhanden sein.
  - Falsche öffentliche oder fremde Repos verständlich ablehnen.
- Repo- und Benutzername auf erlaubte GitHub-Zeichen begrenzen.
- API-Anfragen mit `cache: 'no-store'` und einem Timeout ausführen.
- Token niemals in URL, Log oder Fehlermeldung ausgeben.
- Funktion „Sync trennen“ beibehalten und um „Lokale Daten dieses Geräts löschen“ ergänzen.
- Beim Löschen lokaler Daten eine klare Bestätigung mit Hinweis auf nicht synchronisierte Änderungen anzeigen.
- Nach dem Deployment prüfen, dass App-Repo öffentlich und Daten-Repo privat ist.


**Priorität:** P1  
**Geschätzter Aufwand:** 4–8 Stunden  
**Ergebnis:** Kein stiller Verlust lokaler Änderungen

- Nur einen aktiven Sync-Vorgang gleichzeitig zulassen.
- Bei HTTP 409/412:
  - aktuellen Stand erneut laden,
  - lokale Änderungen erneut zusammenführen,
  - mit neuem SHA bis zu drei Mal speichern.
- Fehler aus Hintergrund-Syncs nicht verschlucken.
- Sichtbaren Status einführen:
  - Synchronisiert
  - Wird synchronisiert
  - Änderungen warten auf Verbindung
  - Sync-Fehler
- Bei erneutem Onlinegehen automatisch erneut versuchen.
- Nach einem Pull die aktuell angezeigte Liste sicher neu laden.
- Merge-Logik deterministisch machen, damit beide Geräte bei gleichen Zeitstempeln denselben Stand behalten.
- Kollisionen gleichnamiger Kommandos bereinigen, sodass der verworfene Datensatz nicht zusätzlich erhalten bleibt.
- Löschmarkierungen und Wiederherstellung alter Daten dokumentieren.


**Priorität:** P1  
**Geschätzter Aufwand:** 2–4 Stunden  
**Ergebnis:** Beschädigte oder manipulierte Daten legen die App nicht lahm

- `daten.json` vor der Verarbeitung gegen ein festes Schema prüfen.
- Pflichtfelder und Datentypen für Kommandos und Einträge validieren.
- Ungültige Datensätze ignorieren oder verständlich melden, statt Exceptions zu erzeugen.
- Maximale Dateigröße festlegen.
- Maximale Längen für Kommando, Ort und Textfelder festlegen.
- Zu viele Einträge oder Kommandos begrenzen beziehungsweise paginieren.
- Bei beschädigter Datei einen lokalen Wiederherstellungsmodus anbieten.
- JSON-Versionierung für spätere Formatänderungen ergänzen.


**Priorität:** P1 für sensible Daten, sonst P2  
**Geschätzter Aufwand:** abhängig von der Entscheidung

#### Option 1: Private Datei ohne Verschlüsselung

- Für normale Hundeschulnotizen wahrscheinlich ausreichend.
- GitHub-Privatsphäre, Token-Schutz und Geräte-Sperre bleiben zwingend.
- Nutzer müssen wissen, dass GitHub ältere Versionen der Datei dauerhaft in der Historie behält.

#### Option 2: Clientseitige Verschlüsselung

- GitHub speichert nur verschlüsselten Inhalt.
- Gemeinsames Passwort wird auf beiden Geräten eingegeben.
- Token und Passwort werden getrennt behandelt.
- Suche, Merge und Backup werden komplexer.
- Verschlüsselung muss vor dem Speichern sensibler Daten konzipiert werden.


- Kein GitHub-PAT im Browser.
- Benutzer- und Geräteverwaltung möglich.
- Höherer Betriebs- und Entwicklungsaufwand.


**Priorität:** P1  
**Geschätzter Aufwand:** 1–3 Stunden  
**Ergebnis:** Weniger Supply-Chain- und Kontorisiko

- GitHub-Actions auf konkrete Commit-SHAs pinnen.
- `actions/checkout` mit `persist-credentials: false` verwenden.
- Nur benötigte Actions zulassen.
- Dependabot für npm- und Action-Abhängigkeiten aktivieren.
- Secret Scanning und Push Protection prüfen und aktivieren.
- Branch-Schutz für `main` einrichten, sobald weitere Personen am Repo arbeiten.
- Vor jedem Release `npm audit`, TypeScript-Prüfung und Production-Build ausführen.
- Änderungen an Workflow-Dateien besonders prüfen.
- Für besonders hohe Sicherheit App-Code und Daten-Repo unter getrennten GitHub-Konten oder Organisationen betreiben.


**Priorität:** P1  
**Geschätzter Aufwand:** 2–4 Stunden  
**Ergebnis:** Alltagstaugliche Nutzung auf beiden Telefonen

- iPhone Safari testen:
  - Zum Home-Bildschirm hinzufügen
  - App aus dem Icon starten
  - Bildschirmrotation
  - Tastatur und Textfelder
  - Safe Area und untere Navigation
- Android Chrome testen:
  - App installieren
  - Zurück-Navigation
  - Offline- und Online-Wechsel
  - Tastatur und lange Textfelder
- Sync-Status dauerhaft und verständlich anzeigen.
- Letzten erfolgreichen Sync-Zeitpunkt anzeigen.
- Offline-Zustand sichtbar machen.
- Detailansicht für Einträge weiter als Hauptleseansicht verwenden.
- Touch-Ziele mindestens fingerfreundlich gestalten.
- Fokuszustände und Beschriftungen für Bedienungshilfen prüfen.
- PWA-Update nach einer neuen Version auf beiden Plattformen testen.


**Priorität:** P1  
**Geschätzter Aufwand:** 3–6 Stunden  
**Ergebnis:** Reproduzierbar geprüfte Version

#### Automatisierte Tests

- Eintrag lokal anlegen, bearbeiten, abhaken und löschen.
- Kommando anlegen, bearbeiten und löschen.
- Merge zweier unterschiedlicher Einträge.
- Merge gleichzeitiger Änderungen am selben Eintrag.
- HTTP-409-Konflikt und Retry.
- Löschung auf Gerät A und anschließender Pull auf Gerät B.
- Gleichnamige Kommandos auf zwei Geräten.
- Ungültiges und unvollständiges `daten.json`.
- Zu große Eingaben.

#### Manuelle Sicherheitstests

- `<script>`- und HTML-Eingaben in allen Textfeldern.
- Falscher Token.
- Token ohne Schreibrecht.
- Abgelaufener Token.
- Öffentliches statt privates Daten-Repo.
- Entferntes oder umbenanntes Daten-Repo.
- Netzwerkunterbrechung während des Speicherns.
- Gleichzeitiges Speichern auf zwei Geräten.
- Prüfung, dass kein Token im Production-Bundle auftaucht.

#### Abnahmekriterien

- App startet aus dem installierten Icon auf iPhone und Android direkt korrekt.
- Daten erscheinen nach einem neuen Eintrag auf dem anderen Gerät.
- Ein kurzzeitiger Netzwerkausfall führt nicht zu stillem Datenverlust.
- Ein ungültiger Token wird verständlich angezeigt und nicht gespeichert, wenn die Prüfung fehlschlägt.
- Daten-Repo ist privat und App-Repo enthält keine privaten Daten.
- Build, Audit und Deployment laufen erfolgreich.


1. PWA-Startadresse korrigieren.
2. Prüfung auf privates Repo und Schreibberechtigung ergänzen.
3. Sync-Konflikte mit Retry und sichtbarem Fehlerstatus beheben.
4. Lokale Datenlöschung ergänzen.
5. Remote-JSON validieren und Größenlimits einführen.
6. GitHub-Actions pinnen und GitHub-Konto mit 2FA/Passkey absichern.
7. Beide Telefone mit einem Test-Token durch den vollständigen Abnahmetest führen.
8. Entscheidung über Git-Historie und Verschlüsselung treffen.
9. Erst danach die App dauerhaft im Alltag verwenden.


| Ausbau | Grober Aufwand | Nutzen |
|---|---:|---|
| Kritische Grundeinrichtung | 2–4 Stunden | Verhindert die wichtigsten Fehlkonfigurationen |
| Zuverlässiger Sync | 4–8 Stunden | Verhindert stille Sync- und Konfliktprobleme |
| Datenvalidierung | 2–4 Stunden | Schutz vor beschädigten Dateien und Eingaben |
| CI- und GitHub-Härtung | 1–3 Stunden | Reduziert Supply-Chain- und Kontorisiken |
| Mobile Abnahme | 2–4 Stunden | Stabiler Alltag auf iPhone und Android |
| Clientseitige Verschlüsselung | 1–2 Tage zusätzlich | Schutz bei Einsicht in GitHub oder Datei-Historie |
| Backend/OAuth-Architektur | mehrere Tage zusätzlich | Kein PAT im Browser, bessere Zugriffskontrolle |


- Reichen private, unverschlüsselte GitHub-Daten für eure Notizen aus?
- Soll die App auf GitHub Pages bleiben oder eine eigene Domain bekommen?
- Soll ein separates GitHub-Konto nur für die Hundeapp verwendet werden?
- Wie lange sollen ältere Daten in der Git-Historie erhalten bleiben?
- Braucht ihr später Export, mehrere Hunde oder mehrere Trainingsarten?
- Soll es einen App-PIN oder eine zusätzliche Sperre geben?


Für euren aktuellen Anwendungsfall würde ich folgende Zielversion anstreben:

- GitHub Pages als kostenloses Hosting
- Öffentliches App-Repo ohne private Daten
- Privates Daten-Repo mit Fine-grained Token
- Korrekte PWA-Startadresse
- Private-Repo- und Schreibberechtigungsprüfung
- Retry-fähiger Sync mit sichtbarem Status
- Lokale Datenlöschung
- JSON-Schema und Größenlimits
- Gepinnte GitHub-Actions
- 2FA/Passkey für GitHub
- Getestet auf genau einem iPhone und einem Android-Gerät
- Keine Verschlüsselung, solange ausschließlich harmlose Hundeschulnotizen gespeichert werden

Diese Version bietet voraussichtlich das beste Verhältnis aus Sicherheit, Kosten, Wartungsaufwand und einfacher Nutzung.
