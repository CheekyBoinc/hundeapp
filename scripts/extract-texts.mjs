// Sammelt alle sichtbaren Texte der App aus den React-Komponenten und
// Datenmodulen für ein Review. Heuristisch: JSX-Text, sprechende Attribute
// (placeholder, title, aria-label, label, hint), Bestätigungsdialoge,
// Fehlermeldungen und benannte Konstanten. Ausgabe: JSON auf stdout.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const srcDir = join(root, 'src');

const SCREEN_BY_FILE = {
  'App.tsx': 'Kopfzeile & Navigation',
  'components/EntriesPage.tsx': 'Einträge',
  'components/EntryModal.tsx': 'Eintrag bearbeiten',
  'components/EntryDetail.tsx': 'Eintrag Detail',
  'components/CommandsPage.tsx': 'Kommandos',
  'components/CommandModal.tsx': 'Kommando bearbeiten',
  'components/DogsPage.tsx': 'Hunde',
  'components/DogForm.tsx': 'Hund bearbeiten',
  'components/DogProfileTab.tsx': 'Hundeprofil',
  'components/DogPicker.tsx': 'Hund wählen',
  'components/WeightTab.tsx': 'Gewicht',
  'components/WeightModal.tsx': 'Gewicht bearbeiten',
  'components/StoolTab.tsx': 'Kot',
  'components/StoolModal.tsx': 'Kot bearbeiten',
  'components/VetTab.tsx': 'Tierarzt',
  'components/VetModal.tsx': 'Tierarzt bearbeiten',
  'components/VaccinationTab.tsx': 'Impfungen',
  'components/VaccinationModal.tsx': 'Impfung bearbeiten',
  'components/CalendarPage.tsx': 'Kalender',
  'components/SettingsModal.tsx': 'Einstellungen',
  'components/SyncSetup.tsx': 'GitHub-Sync einrichten',
  'components/ExportMenu.tsx': 'Export',
  'components/Modal.tsx': 'Dialoge allgemein',
  'components/NavIcons.tsx': 'Icons',
  'github.ts': 'Sync-Meldungen',
  'backup.ts': 'Sicherung',
  'upcoming.ts': 'Kalender: Demnächst',
  'mastery.ts': 'Übungsstand',
  'breeds.ts': 'Gewichts-Status',
  'localStore.ts': 'Demodaten & Speicher',
  'export.ts': 'PDF-Export',
  'hooks.ts': 'Formulare allgemein',
  'theme.ts': 'Design'
};

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (
      /\.(tsx?|)$/.test(name) &&
      /\.tsx?$/.test(name) &&
      !name.endsWith('.test.ts') &&
      !name.endsWith('.d.ts')
    )
      out.push(p);
  }
  return out;
}

const seen = new Map();
function add(file, line, text, kind) {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length < 2) return;
  if (!/[A-Za-zÄÖÜäöüß]/.test(t)) return;
  if (/^[a-z0-9_.-]+$/.test(t) && !/[äöüß]/.test(t)) return; // Bezeichner
  if (/^https?:\/\//.test(t)) return;
  if (/^(rgb|#|var\()/.test(t)) return;
  // Code-Reste und Klassenlisten aussortieren
  if (/[;=(){}]|\bconst\b|\breturn\b|\bnull\b|=>|\/\//.test(t) && kind !== 'Meldung') return;
  if (
    /\b(flex|grid|text-|bg-|border|rounded|shrink|items-|justify-|gap-|px-|py-|p-\d|mt-|mb-|ml-|mr-|h-\d|w-\d|min-h|max-w|opacity|transition|animate|absolute|relative|inline|block|truncate|overflow|tap-target|chip|label|input|btn-)/.test(
      t
    )
  )
    return;
  if (
    /\$\{[^}]*\}/.test(t) &&
    kind !== 'Meldung' &&
    !/wirklich|Fällig|Impfung:|Export –|Hundemarke|Kommando|Richtwert/.test(t)
  )
    return;
  if (
    /^(Promise|Omit|Map|Set|Record|Entry|Command|DogProfile|WeightEntry|StoolEntry|VetVisit|Vaccination|SyncState|string|number|boolean)$/.test(
      t
    )
  )
    return;
  if (/^[0-9 .,:+-]+$/.test(t)) return;
  if (/^[a-z][A-Za-z0-9]*$/.test(t) && /[A-Z]/.test(t)) return; // camelCase-Bezeichner
  const key = `${file}::${t}`;
  if (seen.has(key)) return;
  seen.set(key, {
    id: seen.size + 1,
    file,
    line,
    text: t,
    kind,
    screen: SCREEN_BY_FILE[file] ?? file
  });
}

function lineOf(src, idx) {
  return src.slice(0, idx).split('\n').length;
}

for (const path of walk(srcDir)) {
  const file = relative(srcDir, path);
  const src = readFileSync(path, 'utf8');

  // JSX-Text zwischen Tags: >Text< (ohne Ausdrücke)
  for (const m of src.matchAll(/>([^<>{}]*[A-Za-zÄÖÜäöüß][^<>{}]*)</g)) {
    add(file, lineOf(src, m.index), m[1], 'Text');
  }
  // Attribute mit sichtbarem Text
  for (const m of src.matchAll(
    /\b(placeholder|title|aria-label|label|hint|dialogTitle)=(?:"([^"]+)"|\{'([^']+)'\}|\{`([^`]+)`\})/g
  )) {
    add(file, lineOf(src, m.index), m[2] ?? m[3] ?? m[4], m[1]);
  }
  // Template-/String-Literale in JSX-Ausdrücken: {' … '} und {` … `}
  for (const m of src.matchAll(
    /\{\s*(?:'([^']*[A-Za-zÄÖÜäöüß][^']*)'|`([^`]*[A-Za-zÄÖÜäöüß][^`]*)`)\s*\}/g
  )) {
    add(file, lineOf(src, m.index), m[1] ?? m[2], 'Text');
  }
  // Bedingte Texte: && 'Text' / ? 'Text' : 'Text'
  for (const m of src.matchAll(/(?:&&|\?|:)\s*'([^']*[A-Za-zÄÖÜäöüß][^']{3,})'/g)) {
    add(file, lineOf(src, m.index), m[1], 'Text');
  }
  // Meldungen: confirm(...), Error('…'), SyncError('…'), setError/Notice text
  for (const m of src.matchAll(
    /(?:confirm|Error|SyncError|notifyError|notifyNotice|alert)\(\s*(?:'([^']+)'|`([^`]+)`)/g
  )) {
    add(file, lineOf(src, m.index), m[1] ?? m[2], 'Meldung');
  }
  for (const m of src.matchAll(
    /(?:text|message|label|title|name|hint|beschreibung|tipp|ort|was_gemacht|uebungsaufgaben|tipps|reason|note):\s*(?:'([^']+)'|`([^`]+)`|"([^"]+)")/g
  )) {
    add(file, lineOf(src, m.index), m[1] ?? m[2] ?? m[3], 'Wert');
  }
  // Benannte Konstanten mit Labels: { n: 1, label: '…' }, STATUS_LABEL etc.
  for (const m of src.matchAll(
    /\b(?:[0-9]+|norm|under|over|[a-zA-Z_]+):\s*'([^']*[A-Za-zÄÖÜäöüß][^']*)'/g
  )) {
    add(file, lineOf(src, m.index), m[1], 'Wert');
  }
}

const items = [...seen.values()].sort((a, b) =>
  a.screen === b.screen ? a.line - b.line : a.screen.localeCompare(b.screen, 'de')
);
process.stdout.write(JSON.stringify(items, null, 1));
