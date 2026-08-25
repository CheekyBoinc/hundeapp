import type {
  AppState,
  Command,
  DogProfile,
  Entry,
  StoolEntry,
  Vaccination,
  VetVisit,
  WeightEntry
} from './types';

const COMMANDS_KEY = 'hundeapp.commands';
const ENTRIES_KEY = 'hundeapp.entries';
const DELETED_COMMANDS_KEY = 'hundeapp.deletedCommands';
const DELETED_ENTRIES_KEY = 'hundeapp.deletedEntries';
const DOGS_KEY = 'hundeapp.dogs';
const WEIGHT_KEY = 'hundeapp.weight';
const STOOL_KEY = 'hundeapp.stool';
const VET_KEY = 'hundeapp.vet';
const VACCINATIONS_KEY = 'hundeapp.vaccinations';
const DELETED_DOGS_KEY = 'hundeapp.deletedDogs';
const DELETED_WEIGHT_KEY = 'hundeapp.deletedWeight';
const DELETED_STOOL_KEY = 'hundeapp.deletedStool';
const DELETED_VET_KEY = 'hundeapp.deletedVet';
const DELETED_VACCINATIONS_KEY = 'hundeapp.deletedVaccinations';
const NOTES_MARKER_KEY = 'hundeapp.notizenEingespielt';

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

function uuid(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function now(): string {
  return new Date().toISOString();
}

export function fetchCommands(): Command[] {
  return readJson<Command[]>(COMMANDS_KEY, [])
    .map((c) => ({ ...c, dogId: c.dogId ?? null }))
    .sort((a, b) => a.name.localeCompare(b.name, 'de'));
}

export function saveCommand(cmd: {
  id?: string;
  dogId?: string | null;
  name: string;
  beschreibung?: string | null;
  tipp?: string | null;
}): Command {
  const commands = readJson<Command[]>(COMMANDS_KEY, []);
  const name = cmd.name.trim();
  const existing = commands.find((c) => c.id === cmd.id);
  const duplicate = commands.find(
    (c) => c.id !== cmd.id && c.name.toLowerCase() === name.toLowerCase()
  );
  if (duplicate) throw new Error('Ein Kommando mit diesem Namen gibt es schon.');

  if (existing) {
    existing.name = name;
    existing.dogId = cmd.dogId ?? existing.dogId;
    existing.beschreibung = cmd.beschreibung ?? null;
    existing.tipp = cmd.tipp ?? null;
    existing.updated_at = now();
  } else {
    commands.push({
      id: uuid(),
      dogId: cmd.dogId ?? null,
      name,
      beschreibung: cmd.beschreibung ?? null,
      tipp: cmd.tipp ?? null,
      created_at: now(),
      updated_at: now()
    });
  }
  writeJson(COMMANDS_KEY, commands);

  const final = commands.find((c) => c.name === name);
  if (final) {
    const entries = readJson<Entry[]>(ENTRIES_KEY, []);
    for (const e of entries) {
      e.commands = e.commands.map((c) => (c.id === final.id ? final : c));
    }
    writeJson(ENTRIES_KEY, entries);
  }
  return final as Command;
}

export function deleteCommand(id: string): void {
  const commands = readJson<Command[]>(COMMANDS_KEY, []);
  writeJson(
    COMMANDS_KEY,
    commands.filter((c) => c.id !== id)
  );
  const deleted = readJson<string[]>(DELETED_COMMANDS_KEY, []);
  if (!deleted.includes(id)) writeJson(DELETED_COMMANDS_KEY, [...deleted, id]);
  const entries = readJson<Entry[]>(ENTRIES_KEY, []);
  for (const e of entries) {
    e.commands = e.commands.filter((c) => c.id !== id);
  }
  writeJson(ENTRIES_KEY, entries);
}

export function fetchEntries(): Entry[] {
  return readJson<Entry[]>(ENTRIES_KEY, [])
    .map((e) => ({ ...e, dogId: e.dogId ?? null }))
    .sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return (a.created_at || '').localeCompare(b.created_at || '');
    });
}

export function saveEntry(
  input: {
    id?: string;
    dogId?: string | null;
    date: string;
    ort: string | null;
    was_gemacht: string | null;
    uebungsaufgaben: string | null;
    tipps: string | null;
    erledigt: boolean;
  },
  commandIds: string[]
): void {
  const entries = readJson<Entry[]>(ENTRIES_KEY, []);
  const commands = readJson<Command[]>(COMMANDS_KEY, []);
  const commandMap = new Map(commands.map((c) => [c.id, c]));
  const linked = commandIds.map((id) => commandMap.get(id)).filter((c): c is Command => Boolean(c));

  const existing = entries.find((e) => e.id === input.id);
  if (existing) {
    existing.dogId = input.dogId ?? existing.dogId;
    existing.date = input.date;
    existing.ort = input.ort;
    existing.was_gemacht = input.was_gemacht;
    existing.uebungsaufgaben = input.uebungsaufgaben;
    existing.tipps = input.tipps;
    existing.erledigt = input.erledigt;
    existing.commands = linked;
    existing.updated_at = now();
  } else {
    entries.push({
      id: uuid(),
      dogId: input.dogId ?? null,
      date: input.date,
      ort: input.ort,
      was_gemacht: input.was_gemacht,
      uebungsaufgaben: input.uebungsaufgaben,
      tipps: input.tipps,
      erledigt: input.erledigt,
      created_at: now(),
      updated_at: now(),
      commands: linked
    });
  }
  writeJson(ENTRIES_KEY, entries);
}

export function toggleEntryDone(id: string, erledigt: boolean): void {
  const entries = readJson<Entry[]>(ENTRIES_KEY, []);
  const entry = entries.find((e) => e.id === id);
  if (entry) {
    entry.erledigt = erledigt;
    entry.updated_at = now();
    writeJson(ENTRIES_KEY, entries);
  }
}

export function deleteEntry(id: string): void {
  writeJson(
    ENTRIES_KEY,
    readJson<Entry[]>(ENTRIES_KEY, []).filter((e) => e.id !== id)
  );
  const deleted = readJson<string[]>(DELETED_ENTRIES_KEY, []);
  if (!deleted.includes(id)) writeJson(DELETED_ENTRIES_KEY, [...deleted, id]);
}

// ===== Gesamtzustand (für GitHub-Sync) =====

export function loadState(): AppState {
  return {
    commands: readJson<Command[]>(COMMANDS_KEY, []),
    entries: readJson<Entry[]>(ENTRIES_KEY, []),
    dogs: readJson<DogProfile[]>(DOGS_KEY, []),
    weight: readJson<WeightEntry[]>(WEIGHT_KEY, []),
    stool: readJson<StoolEntry[]>(STOOL_KEY, []),
    vet: readJson<VetVisit[]>(VET_KEY, []),
    vaccinations: readJson<Vaccination[]>(VACCINATIONS_KEY, []),
    deleted: {
      commands: readJson<string[]>(DELETED_COMMANDS_KEY, []),
      entries: readJson<string[]>(DELETED_ENTRIES_KEY, []),
      dogs: readJson<string[]>(DELETED_DOGS_KEY, []),
      weight: readJson<string[]>(DELETED_WEIGHT_KEY, []),
      stool: readJson<string[]>(DELETED_STOOL_KEY, []),
      vet: readJson<string[]>(DELETED_VET_KEY, []),
      vaccinations: readJson<string[]>(DELETED_VACCINATIONS_KEY, [])
    }
  };
}

export function saveState(state: AppState): void {
  writeJson(COMMANDS_KEY, state.commands);
  writeJson(ENTRIES_KEY, state.entries);
  writeJson(DOGS_KEY, state.dogs);
  writeJson(WEIGHT_KEY, state.weight);
  writeJson(STOOL_KEY, state.stool);
  writeJson(VET_KEY, state.vet);
  writeJson(VACCINATIONS_KEY, state.vaccinations);
  writeJson(DELETED_COMMANDS_KEY, state.deleted.commands);
  writeJson(DELETED_ENTRIES_KEY, state.deleted.entries);
  writeJson(DELETED_DOGS_KEY, state.deleted.dogs);
  writeJson(DELETED_WEIGHT_KEY, state.deleted.weight);
  writeJson(DELETED_STOOL_KEY, state.deleted.stool);
  writeJson(DELETED_VET_KEY, state.deleted.vet);
  writeJson(DELETED_VACCINATIONS_KEY, state.deleted.vaccinations);
}

// ===== Hunde =====

function addTombstone(key: string, id: string): void {
  const list = readJson<string[]>(key, []);
  if (!list.includes(id)) writeJson(key, [...list, id]);
}

export function fetchDogs(): DogProfile[] {
  return readJson<DogProfile[]>(DOGS_KEY, []).sort((a, b) => a.name.localeCompare(b.name, 'de'));
}

export function saveDogProfile(
  dog: Omit<DogProfile, 'id' | 'created_at' | 'updated_at'> & { id?: string }
): DogProfile {
  const dogs = readJson<DogProfile[]>(DOGS_KEY, []);
  const existing = dogs.find((d) => d.id === dog.id);
  if (existing) {
    Object.assign(existing, dog, { updated_at: now() });
  } else {
    dogs.push({ ...dog, id: uuid(), created_at: now(), updated_at: now() });
  }
  writeJson(DOGS_KEY, dogs);
  return dogs.find((d) => d.id === (dog.id ?? '')) ?? dogs[dogs.length - 1];
}

export function deleteDog(id: string): void {
  writeJson(
    DOGS_KEY,
    readJson<DogProfile[]>(DOGS_KEY, []).filter((d) => d.id !== id)
  );
  addTombstone(DELETED_DOGS_KEY, id);
  // Kaskadenlöschung der zugehörigen Einträge
  const weight = readJson<WeightEntry[]>(WEIGHT_KEY, []).filter((w) => w.dogId !== id);
  const stool = readJson<StoolEntry[]>(STOOL_KEY, []).filter((s) => s.dogId !== id);
  const vet = readJson<VetVisit[]>(VET_KEY, []).filter((v) => v.dogId !== id);
  const vax = readJson<Vaccination[]>(VACCINATIONS_KEY, []).filter((v) => v.dogId !== id);
  for (const w of readJson<WeightEntry[]>(WEIGHT_KEY, []).filter((x) => x.dogId === id))
    addTombstone(DELETED_WEIGHT_KEY, w.id);
  for (const s of readJson<StoolEntry[]>(STOOL_KEY, []).filter((x) => x.dogId === id))
    addTombstone(DELETED_STOOL_KEY, s.id);
  for (const v of readJson<VetVisit[]>(VET_KEY, []).filter((x) => x.dogId === id))
    addTombstone(DELETED_VET_KEY, v.id);
  for (const v of readJson<Vaccination[]>(VACCINATIONS_KEY, []).filter((x) => x.dogId === id))
    addTombstone(DELETED_VACCINATIONS_KEY, v.id);
  writeJson(WEIGHT_KEY, weight);
  writeJson(STOOL_KEY, stool);
  writeJson(VET_KEY, vet);
  writeJson(VACCINATIONS_KEY, vax);
  // Kommandos und Einträge des Hundes werden "allgemein" (dogId = null), damit Trainingsdaten erhalten bleiben
  const commands = readJson<Command[]>(COMMANDS_KEY, []);
  for (const c of commands)
    if (c.dogId === id) {
      c.dogId = null;
      c.updated_at = now();
    }
  writeJson(COMMANDS_KEY, commands);
  const entries = readJson<Entry[]>(ENTRIES_KEY, []);
  for (const e of entries)
    if (e.dogId === id) {
      e.dogId = null;
      e.updated_at = now();
    }
  writeJson(ENTRIES_KEY, entries);
}

// ===== Hundezugehörige Sammlungen (Gewicht, Kot, Tierarzt, Impfungen) =====

interface DogCollectionItem {
  id: string;
  dogId: string;
  date: string;
  created_at: string;
  updated_at?: string;
}

type DogCollectionInput<T extends DogCollectionItem> = Omit<
  T,
  'id' | 'created_at' | 'updated_at'
> & { id?: string };

function makeDogCollection<T extends DogCollectionItem>(key: string, deletedKey: string) {
  return {
    fetch(dogId: string): T[] {
      return readJson<T[]>(key, [])
        .filter((x) => x.dogId === dogId)
        .sort((a, b) => a.date.localeCompare(b.date));
    },
    save(input: DogCollectionInput<T>): T {
      const list = readJson<T[]>(key, []);
      const existing = list.find((x) => x.id === input.id);
      if (existing) {
        Object.assign(existing, input, { updated_at: now() });
      } else {
        list.push({ ...input, id: uuid(), created_at: now(), updated_at: now() } as T);
      }
      writeJson(key, list);
      return list.find((x) => x.id === (input.id ?? '')) ?? list[list.length - 1];
    },
    remove(id: string): void {
      writeJson(
        key,
        readJson<T[]>(key, []).filter((x) => x.id !== id)
      );
      addTombstone(deletedKey, id);
    }
  };
}

const weightCollection = makeDogCollection<WeightEntry>(WEIGHT_KEY, DELETED_WEIGHT_KEY);
export const fetchWeights = weightCollection.fetch;
export const saveWeight = weightCollection.save;
export const deleteWeight = weightCollection.remove;

const stoolCollection = makeDogCollection<StoolEntry>(STOOL_KEY, DELETED_STOOL_KEY);
export const fetchStools = stoolCollection.fetch;
export const saveStool = stoolCollection.save;
export const deleteStool = stoolCollection.remove;

const vetCollection = makeDogCollection<VetVisit>(VET_KEY, DELETED_VET_KEY);
export const fetchVets = vetCollection.fetch;
export const saveVet = vetCollection.save;
export const deleteVet = vetCollection.remove;

const vaccinationCollection = makeDogCollection<Vaccination>(
  VACCINATIONS_KEY,
  DELETED_VACCINATIONS_KEY
);
export const fetchVaccinations = vaccinationCollection.fetch;
export const saveVaccination = vaccinationCollection.save;
export const deleteVaccination = vaccinationCollection.remove;

// ===== Start-Notizen (deterministische IDs, damit beide Geräte identisch seeden) =====

interface NoteCommand {
  id: string;
  dogId: string | null;
  name: string;
  beschreibung: string | null;
  tipp: string | null;
  created_at: string;
}

interface NoteEntry {
  id: string;
  dogId: string | null;
  date: string;
  ort: string;
  was_gemacht: string;
  uebungsaufgaben: string;
  tipps: string;
  erledigt: boolean;
  commands: string[];
  created_at: string;
}

const NOTE_COMMANDS: NoteCommand[] = [
  {
    id: 'seed-cmd-sitz',
    dogId: null,
    name: 'Sitz',
    beschreibung: 'Handzeichen: Erhobener Finger.',
    tipp: null,
    created_at: '2026-08-11T00:00:00.000Z'
  },
  {
    id: 'seed-cmd-platz',
    dogId: null,
    name: 'Platz',
    beschreibung: 'Handzeichen: Flache Hand nach unten und eindeutig nach unten bewegen.',
    tipp: 'Noch nicht geübt.',
    created_at: '2026-08-11T00:00:00.000Z'
  },
  {
    id: 'seed-cmd-bleib',
    dogId: null,
    name: 'Bleib',
    beschreibung: 'Handzeichen: Flache Hand nach vorne ausgestreckt (wie ein Stopp-Zeichen).',
    tipp: 'Suse darf die Position (Sitz, Steh oder Liegen) frei wählen. Wichtig: Vorher niemals das Kommando „Sitz“ oder „Platz“ geben – sonst muss sie zwingend in genau dieser Position verharren.',
    created_at: '2026-08-11T00:00:00.000Z'
  },
  {
    id: 'seed-cmd-komm',
    dogId: null,
    name: 'Komm',
    beschreibung: 'Bedeutung: Herankommen bzw. zielstrebig auf dich zulaufen.',
    tipp: null,
    created_at: '2026-08-11T00:00:00.000Z'
  },
  {
    id: 'seed-cmd-stups',
    dogId: null,
    name: 'Stups',
    beschreibung: 'Bedeutung/Ausführung: Suse soll mit der Nase gegen deine Handfläche stupsen.',
    tipp: 'Wird beim Heranrufen genutzt, damit sie gezielt bei dir ankommt und abstoppt, statt an dir vorbeizurennen.',
    created_at: '2026-08-11T00:00:00.000Z'
  },
  {
    id: 'seed-cmd-fuss',
    dogId: null,
    name: 'Fuß',
    beschreibung: 'Bedeutung: Direkt am Bein mitlaufen (immer auf der rechten Seite).',
    tipp: null,
    created_at: '2026-08-11T00:00:00.000Z'
  }
];

const NOTE_ENTRIES: NoteEntry[] = [
  {
    id: 'seed-entry-2026-08-11',
    dogId: null,
    date: '2026-08-11',
    ort: 'Hundeplatz',
    was_gemacht:
      'Allererste Stunde auf dem Hundeplatz in einer Gruppe mit fünf Hunden. Leinenführigkeit an der langen Leine hat schon gut funktioniert. Abruf auf Entfernung: 2 von 3 Versuchen sehr gut – Suse hat das Aushalten auf Distanz vorher gut gemeistert. Fußlaufen steht noch am Anfang. Suse hat die neue Situation insgesamt gut gemeistert.',
    uebungsaufgaben:
      'Das Kommando „Stups“ üben, damit das Abstoppen an der Hand beim Heranrufen in Fleisch und Blut übergeht.',
    tipps:
      'Beim Abruf soll Suse als Abschluss mit der Nase an die Handfläche stupsen – dafür gibt es direkt das Leckerchen. Das verhindert, dass sie vorbeirennt.',
    erledigt: false,
    commands: ['seed-cmd-komm', 'seed-cmd-stups', 'seed-cmd-fuss'],
    created_at: '2026-08-11T00:00:00.000Z'
  },
  {
    id: 'seed-entry-2026-08-18',
    dogId: null,
    date: '2026-08-18',
    ort: 'Halle',
    was_gemacht:
      'Impulskontrolle (Bleiben unter Ablenkung): fremde Menschen und andere Hunde gehen vorbei. Direkt neben dem Bein und auch auf Distanz sehr gut ausgehalten – höchstens um die eigene Achse gedreht, den Platz aber nicht verlassen. Fußlaufen (rechte Seite) läuft noch nicht optimal: Suse versteht das Konzept noch nicht – hier liegt die kommende Baustelle. Suse hat die Reize in der Halle toll ausgehalten und super mitgemacht.',
    uebungsaufgaben:
      'Fußlaufen auf der rechten Seite in kleinen Intervallen üben: 3–4 Schritte gehen → stehen bleiben → Suse absitzen lassen → in die gleiche Richtung weiterlaufen.',
    tipps:
      'Wichtiger Merksatz: Immer mit dem Bein loslaufen, an dem der Hund geführt wird (in eurem Fall das rechte Bein). So bekommt Suse den Impuls zum Loslaufen direkt mit.',
    erledigt: false,
    commands: ['seed-cmd-bleib', 'seed-cmd-fuss'],
    created_at: '2026-08-18T00:00:00.000Z'
  }
];

export function loadNotes(): void {
  const commands: Command[] = NOTE_COMMANDS.map((nc) => ({ ...nc }));
  const byId = new Map(commands.map((c) => [c.id, c]));

  const entries: Entry[] = NOTE_ENTRIES.map((ne) => ({
    ...ne,
    commands: ne.commands.map((n) => byId.get(n)).filter((c): c is Command => Boolean(c))
  }));

  writeJson(COMMANDS_KEY, commands);
  writeJson(ENTRIES_KEY, entries);
  localStorage.setItem(NOTES_MARKER_KEY, '1');
}

export function hasData(): boolean {
  return (
    readJson<Entry[]>(ENTRIES_KEY, []).length > 0 ||
    readJson<Command[]>(COMMANDS_KEY, []).length > 0
  );
}

export function autoSeedIfEmpty(): void {
  if (localStorage.getItem(NOTES_MARKER_KEY)) return;
  if (hasData()) return;
  loadNotes();
}
