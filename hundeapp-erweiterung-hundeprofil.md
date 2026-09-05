# Hundeapp-Erweiterung: Hundeprofil, Gewicht, Kot & Tierarzt

**Status:** Plan zur Bewertung – noch nicht umgesetzt  
**Ziel:** Gesundheits- und Profildaten zum Hund direkt in der bestehenden App verwalten und weiterhin synchronisieren.

## 1. Zielbild

Die App bekommt zusätzlich zu den Trainings-Einträgen einen Bereich **„Hund“** mit:

1. **Hundeprofil** – feste Stammdaten zum Hund (Name, Rasse, Geburtsdatum, Geschlecht, Chip-/Register-Nummer, Anschrift Tierarzt, Allergien, Besonderheiten)
2. **Gewichtsverlauf** – Gewicht über Zeit (Datum + kg), als Liste und Diagramm
3. **Kotverlauf** – Beobachtungen, z. B. Konsistenz, Farbe, Auffälligkeiten, mit Datum
4. **Tierarztbesuche** – Datum, Praxis/Grund, Befund, Behandlung, Impfungen, Medikamente, Folgetermin, Notizen

Alles bleibt **offline-first** (localStorage) und wird wie bisher über `daten.json` in GitHub **synchronisiert**.

## 2. Vorhandene Struktur (Referenz)

Aktuell gibt es zwei Datentypen, beide identisch behandelt in Speicherung, Sync und Merge:

- `Command` und `Entry` in `src/types.ts`
- localStorage-Keys `hundeapp.commands` / `hundeapp.entries` (`src/localStore.ts`)
- GitHub `SyncState { commands, entries, deleted }` + `mergeStates()` in `src/github.ts`
- UI-Tabs `eintraege` / `kommandos` in `src/App.tsx`

Der Plan nutzt dieses Muster für die neuen Datentypen – **konsistent, wiederverwendbar, ohne Architekturwechsel**.

## 3. Grundsatzentscheidungen (vorab klären)

| Frage                                 | Entscheidung (ihr habt gewählt)                                             |
| ------------------------------------- | --------------------------------------------------------------------------- |
| Ein Hund oder mehrere?                | **Mehrere Hunde** – Daten werden pro Hund (über `dogId`) geführt            |
| Neue Daten in dieselbe `daten.json`?  | **Ja** – eine Datei = ein Sync-Weg                                          |
| Diagramm fürs Gewicht selbst bauen?   | **Ja, schlicht** (SVG-Linienchart), ohne Chart-Bibliothek                   |
| Auffällig-Markierung bei Kot/Gewicht? | **Ja** – Ampel-/Auffällig-Flag                                              |
| Impfpass                              | **Ja, eigene Impfungen-Liste** (Datum, Impfstoff, nächste Fälligkeit, Hund) |
| Einheit Gewicht                       | **kg**                                                                      |

## 4. Datenmodell (`src/types.ts`)

```ts
export interface DogProfile {
  id: string; // eindeutig, pro Hund
  name: string;
  rasse: string | null;
  geburtsdatum: string | null; // ISO-Datum
  geschlecht: 'w' | 'm' | null;
  chipNr: string | null;
  registerNr: string | null;
  tierarzt: string | null; // Name/Anschrift
  allergien: string | null;
  besonderheiten: string | null; // Freitext
  created_at: string;
  updated_at?: string;
}

export interface WeightEntry {
  id: string;
  dogId: string; // Zuordnung zum Hund
  date: string;
  weightKg: number;
  note: string | null;
  created_at: string;
  updated_at?: string;
}

export interface StoolEntry {
  id: string;
  dogId: string;
  date: string;
  consistency: number; // 1–7 (Bristol-Skala), 0 = unbekannt
  color: string | null; // z. B. braun, schwarz, gelb …
  amount: 'wenig' | 'normal' | 'viel' | null;
  abnormal: boolean; // Auffällig-Flag
  note: string | null;
  created_at: string;
  updated_at?: string;
}

export interface VetVisit {
  id: string;
  dogId: string;
  date: string;
  clinic: string | null; // Praxis
  reason: string | null; // Grund
  diagnosis: string | null; // Befund
  treatment: string | null; // Behandlung
  medication: string | null; // Medikamente
  followUp: string | null; // Folgetermin
  note: string | null;
  created_at: string;
  updated_at?: string;
}

export interface Vaccination {
  id: string;
  dogId: string;
  date: string; // Datum der Impfung
  name: string; // Impfstoff (z. B. Tollwut, Staupe)
  nextDue: string | null; // nächstes Fälligkeitsdatum
  note: string | null;
  created_at: string;
  updated_at?: string;
}
```

**Entscheidung:** Alle gesundheitsbezogenen Einträge sind über **`dogId`** einem Hund zugeordnet. Ein Hund kann mehrere Gewichts-, Kot-, Tierarzt- und Impf-Einträge haben. **Mehrere Tierarztbesuche am selben Tag** sind erlaubt (eigenständige Einträge).

## 5. Speicherung: localStorage (`src/localStore.ts`)

Neue Keys:

- `hundeapp.dogs` – Array von `DogProfile` (mehrere Hunde)
- `hundeapp.weight` – Array von `WeightEntry`
- `hundeapp.stool` – Array von `StoolEntry`
- `hundeapp.vet` – Array von `VetVisit`
- `hundeapp.vaccinations` – Array von `Vaccination`
- `hundeapp.deletedDogs`, `hundeapp.deletedWeight`, `hundeapp.deletedStool`, `hundeapp.deletedVet`, `hundeapp.deletedVaccinations` – Tombstones

Neue Funktionen (analog `saveCommand`/`deleteCommand`):

- `fetchDogs()`, `saveDogProfile()`, `deleteDog()` (löscht kaskadierend zugehörige Gewicht/Kot/Tierarzt/Impfungen des Hundes)
- `fetchWeights(dogId)`, `saveWeight()`, `deleteWeight()`
- `fetchStools(dogId)`, `saveStool()`, `deleteStool()`
- `fetchVets(dogId)`, `saveVet()`, `deleteVet()`
- `fetchVaccinations(dogId)`, `saveVaccination()`, `deleteVaccination()`

Beim Anlegen/Ändern wird wie bisher `updated_at = now()` gesetzt. Löschen trägt den Eintrag in die jeweilige Tombstone-Liste ein (damit kein Gerät es wieder hochlädt). Beim Löschen eines **Hundes** werden die Tombstones seiner Kind-Einträge ebenfalls gesetzt; damit verschwinden sie auf allen Geräten.

## 6. Sync: GitHub (`src/github.ts`)

`SyncState` und `emptyState()` erweitern:

```ts
export interface SyncState {
  commands: Command[];
  entries: Entry[];
  dogs: DogProfile[];
  weight: WeightEntry[];
  stool: StoolEntry[];
  vet: VetVisit[];
  vaccinations: Vaccination[];
  deleted: {
    commands: string[];
    entries: string[];
    dogs: string[];
    weight: string[];
    stool: string[];
    vet: string[];
    vaccinations: string[];
  };
}
```

- `fetchFile()` / `parse`: neue Arrays tolerant einlesen (`Array.isArray(...) ? ... : []`)
- `areEqual()` / `normalize()`: neue Arrays mitsortieren
- `mergeStates()`: alle neuen Listen (dogs, weight, stool, vet, vaccinations) wie `entries` mergen (pro ID, neuerer `updated_at` gewinnt, Tombstone-Filter).
- **Wichtig:** Migration abwärtskompatibel halten – alte `daten.json` ohne die neuen Felder (in bestehendem Repo) muss weiter lesbar bleiben. Dazu: wenn Feld fehlt → `[]`, und beim ersten Speichern werden die neuen Felder ergänzt.

## 7. UI-Struktur (`src/App.tsx` + neue Komponenten)

**Navigation:**

- Neuer Haupt-Tab **„Hunde“** zusätzlich zu „Einträge“ / „Kommandos“.
- Der „Hunde“-Tab hat **oben eine Hund-Auswahl** (Dropdown mit allen Hunden + „Hund hinzufügen“).
- Darunter eine **Unter-Navigation** mit 5 Bereichen:
  - Profil
  - Gewicht
  - Kot
  - Tierarzt
  - Impfungen
- Umschaltbarkeit oben/unten (aus dem Einstellungen-Menü) gilt automatisch für alle Tabs.

**Neue Komponenten:**

| Komponente                                                                     | Funktion                                                              |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| `DogsPage.tsx`                                                                 | Container: Hund-Auswahl + 5 Unter-Tabs                                |
| `DogSelector.tsx`                                                              | Dropdown zur Hund-Auswahl inkl. „+ Hund“                              |
| `DogForm.tsx`                                                                  | Hund anlegen/bearbeiten (Stammdaten)                                  |
| `DogProfileTab.tsx`                                                            | Stammdaten des gewählten Hundes anzeigen/bearbeiten                   |
| `WeightTab.tsx`                                                                | Liste + einfaches SVG-Liniendiagramm + „Gewicht hinzufügen“           |
| `StoolTab.tsx`                                                                 | Liste mit Konsistenz-/Farbe-Auswahl, Auffällig-Markierung, Hinzufügen |
| `VetTab.tsx`                                                                   | Chronologische Liste, Detail-Modal, Hinzufügen/Bearbeiten             |
| `VaccinationTab.tsx`                                                           | Impfpass: Liste, Fälligkeits-Markierung, Hinzufügen/Bearbeiten        |
| `WeightModal.tsx` / `StoolModal.tsx` / `VetModal.tsx` / `VaccinationModal.tsx` | Eingabe-Formulare (Bottom-Sheet, wie bisher)                          |

**Charts:** `WeightTab` rendert ein kleines SVG-Liniendiagramm (Datum → kg) ohne Zusatzbibliothek; bei <2 Messpunkten Hinweis „Weitere Messungen anlegen“.

## 8. Benutzerführung & UX-Details

- **Hunde-Auswahl:** Wird nur ein Hund angelegt, wird er automatisch gewählt und das Dropdown dezent angezeigt. Mehrere Hunde → Dropdown prominent.
- **Profil:** Stammdaten pro Hund; leerer Zustand mit Hinweis „Profil ausfüllen“. Rasse/Geschlecht als Dropdown bzw. Chips.
- **Gewicht:** Wert mit Dezimaltrennzeichen (Komma), Datum; letzter Wert + Differenz zum vorherigen (z. B. „+0,3 kg“) prominent anzeigen.
- **Kot:** Bristol-Skala als 7 Stufen mit kurzer Beschreibung; „Auffällig“-Switch markiert Eintrag rot.
- **Tierarzt:** Mehrere Besuche pro Tag erlaubt; Sortierung nach Datum; überfälliger Folgetermin (Datum < heute) gelb markieren.
- **Impfpass:** Liste aller Impfungen des Hundes; Fälligkeit „fällig/überfällig“ farblich markieren; Impfungen sind unabhängig von Tierarztbesuchen.
- Alles responsive (Karten auf Mobil, Tabelle/Grid auf Desktop), wie bei Einträgen.

## 9. Datenschutz & Sicherheit (weil Gesundheitsdaten)

Diese neuen Daten sind sensibler als reine Trainingsnotizen.

- Daten-Repo bleibt **privat** – verbindlich.
- Token bleibt fein abgestimmt auf nur dieses Repo, Ablaufdatum.
- Hinweis im README ergänzen, dass Gewicht/Kot/Tierarzt **persönliche Gesundheitsdaten** sind und das Repo privat bleiben **muss**.
- Optionale spätere Maßnahme (aus dem bestehenden Audit-Plan): clientseitige Verschlüsselung der `daten.json`, falls gewünscht.

## 10. Tests

- Profil anlegen, bearbeiten, widerrufen.
- Gewicht addieren, bearbeiten, löschen; Diagramm rendert bei 1, 2, 10 Punkten; Werte mit Komma vs. Punkt.
- Kot mit allen Bristol-Stufen, Auffällig-Flag, verschiedene Farben.
- Tierarzt: mehrere Besuche pro Tag; überfälliger Termin wird markiert.
- Impfungen: Fälligkeit wird korrekt als fällig/überfällig markiert.
- Sync: neuer Eintrag auf Gerät A erscheint auf Gerät B; Löschung bleibt gelöscht (Tombstone).
- Kaskade: Hund löschen entfernt zugehörige Gewicht/Kot/Tierarzt/Impfungen auf allen Geräten.
- **Migrationstest:** vorhandenes `daten.json` ohne neue Felder → App stürzt nicht ab und ergänzt Felder.
- Leere Zustände aller 5 Bereiche; Hund-Auswahl mit 0, 1 und mehreren Hunden.

## 11. Aufwandsschätzung

| Arbeit                                     |     Grober Aufwand |
| ------------------------------------------ | -----------------: |
| Datenmodell + localStorage (mehrhundfähig) |           2–3 Std. |
| Sync-Erweiterung + Migration               |           2–3 Std. |
| Hunde-Container + Auswahl + Navigation     |           2–3 Std. |
| Profil + Formular                          |           2–3 Std. |
| Gewicht + Diagramm                         |           3–4 Std. |
| Kot                                        |           2–3 Std. |
| Tierarzt                                   |           2–3 Std. |
| Impfpass                                   |           2–3 Std. |
| Tests + Abnahme                            |           4–5 Std. |
| **Gesamt**                                 | **ca. 21–30 Std.** |

## 12. Empfohlene Reihenfolge

1. Datenmodell → localStorage → Sync-Erweiterung (Fundament, mehrhundfähig)
2. Navigation „Hunde“ + Hund-Auswahl + Unter-Tabs (Gerüst)
3. Hundeprofil (schnellster sichtbarer Erfolg)
4. Tierarzt (viel Freitext, einfach)
5. Impfpass (eigenständige Liste + Fälligkeiten)
6. Gewicht + Diagramm
7. Kot
8. Tests, Migrationstest, Live-Deploy

## 13. Festgelegte Entscheidungen

- **Mehrere Hunde** – Verwaltung über `dogId`.
- **Mehrere Tierarzt-Besuche pro Tag** erlaubt.
- **Impfpass** mit eigener Impfungs-Liste inkl. Fälligkeitsdatum.
- **Gewicht in kg** (deutsche Einheit).
- Gewicht/Kot bleiben **unabhängig** von den Trainings-Einträgen.
