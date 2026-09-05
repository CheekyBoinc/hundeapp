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
    if (cmd.dogId !== undefined) existing.dogId = cmd.dogId;
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
    if (input.dogId !== undefined) existing.dogId = input.dogId;
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

// ===== Demodaten (nur für einen frischen Start ohne Sync) =====
// Neutrale Beispiele, damit die App nicht leer wirkt. Sie werden nur
// eingespielt, wenn der Nutzer bewusst ohne Synchronisierung startet und
// noch keine eigenen Daten hat. Ein Gerät, das direkt den Sync einrichtet,
// bekommt keine Demodaten, damit nichts in ein bestehendes Repo gemischt wird.

const DEMO_MARKER_KEY = 'hundeapp.demoEingespielt';

interface DemoCommand {
  id: string;
  name: string;
  beschreibung: string | null;
  tipp: string | null;
}

interface DemoEntry {
  id: string;
  daysAgo: number;
  ort: string;
  was_gemacht: string;
  uebungsaufgaben: string;
  tipps: string;
  erledigt: boolean;
  commands: string[];
}

const DEMO_COMMANDS: DemoCommand[] = [
  {
    id: 'demo-cmd-sitz',
    name: 'Sitz',
    beschreibung: 'Der Hund setzt sich und bleibt sitzen, bis er aufgelöst wird.',
    tipp: 'Leckerli langsam über die Nase nach hinten führen, das Hinterteil geht von selbst nach unten.'
  },
  {
    id: 'demo-cmd-platz',
    name: 'Platz',
    beschreibung: 'Der Hund legt sich ab. Handzeichen: flache Hand nach unten.',
    tipp: 'Erst aus dem Sitz aufbauen, später auch aus dem Stehen.'
  },
  {
    id: 'demo-cmd-bleib',
    name: 'Bleib',
    beschreibung: 'Der Hund hält seine Position, auch wenn du dich entfernst.',
    tipp: 'Distanz und Dauer getrennt steigern, nie beides gleichzeitig.'
  },
  {
    id: 'demo-cmd-hier',
    name: 'Hier',
    beschreibung: 'Rückruf: Der Hund kommt zügig zu dir und bleibt bei dir.',
    tipp: 'Immer belohnen, auch wenn es lange gedauert hat. Nie zum Schimpfen rufen.'
  },
  {
    id: 'demo-cmd-fuss',
    name: 'Fuß',
    beschreibung: 'Der Hund läuft dicht neben dem Bein mit, ohne zu ziehen.',
    tipp: 'Mit wenigen Schritten beginnen und häufig belohnen.'
  }
];

const DEMO_ENTRIES: DemoEntry[] = [
  {
    id: 'demo-entry-1',
    daysAgo: 14,
    ort: 'Hundeschule',
    was_gemacht:
      'Beispiel-Eintrag: Erste Stunde in der Gruppe. Sitz und Platz klappen mit Leckerli schon gut. Der Rückruf funktioniert, solange keine anderen Hunde in der Nähe sind.',
    uebungsaufgaben: 'Täglich dreimal kurz Sitz und Platz üben, jeweils nur ein bis zwei Minuten.',
    tipps:
      'Belohnung sofort geben, damit der Hund das Verhalten mit dem Kommando verknüpft. Übungen immer mit einem Erfolg beenden.',
    erledigt: true,
    commands: ['demo-cmd-sitz', 'demo-cmd-platz', 'demo-cmd-hier']
  },
  {
    id: 'demo-entry-2',
    daysAgo: 7,
    ort: 'Spaziergang',
    was_gemacht:
      'Beispiel-Eintrag: Bleib auf dem Feldweg geübt, erst zwei Schritte Abstand, dann fünf. Fuß laufen auf dem Rückweg, noch mit viel Ablenkung durch Gerüche.',
    uebungsaufgaben:
      'Bleib mit wachsender Distanz üben. Fuß in kurzen Abschnitten von zehn Schritten.',
    tipps:
      'Beim Losgehen mit dem Bein starten, an dem der Hund läuft. So bekommt er den Impuls direkt mit.',
    erledigt: false,
    commands: ['demo-cmd-bleib', 'demo-cmd-fuss']
  }
];

function dateDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

export function loadDemoData(): void {
  const stamp = now();
  const commands: Command[] = DEMO_COMMANDS.map((c) => ({
    ...c,
    dogId: null,
    created_at: stamp,
    updated_at: stamp
  }));
  const byId = new Map(commands.map((c) => [c.id, c]));

  const entries: Entry[] = DEMO_ENTRIES.map(({ daysAgo, commands: ids, ...rest }) => ({
    ...rest,
    dogId: null,
    date: dateDaysAgo(daysAgo),
    created_at: stamp,
    updated_at: stamp,
    commands: ids.map((id) => byId.get(id)).filter((c): c is Command => Boolean(c))
  }));

  writeJson(COMMANDS_KEY, commands);
  writeJson(ENTRIES_KEY, entries);
  localStorage.setItem(DEMO_MARKER_KEY, '1');
}

export function hasData(): boolean {
  return (
    readJson<Entry[]>(ENTRIES_KEY, []).length > 0 ||
    readJson<Command[]>(COMMANDS_KEY, []).length > 0
  );
}

// Vor dem Einrichten der Synchronisierung: Sind ausschließlich unveränderte
// Demodaten vorhanden, werden sie verworfen, damit sie nicht in ein
// bestehendes Repo (z. B. vom zweiten Handy) gemischt werden.
export function discardUntouchedDemoData(): void {
  const lists: { id: string }[][] = [
    readJson<Entry[]>(ENTRIES_KEY, []),
    readJson<Command[]>(COMMANDS_KEY, []),
    readJson<DogProfile[]>(DOGS_KEY, []),
    readJson<WeightEntry[]>(WEIGHT_KEY, []),
    readJson<StoolEntry[]>(STOOL_KEY, []),
    readJson<VetVisit[]>(VET_KEY, []),
    readJson<Vaccination[]>(VACCINATIONS_KEY, [])
  ];
  const all = lists.flat();
  if (all.length === 0) return;
  if (!all.every((x) => x.id.startsWith('demo-'))) return;
  writeJson(ENTRIES_KEY, []);
  writeJson(COMMANDS_KEY, []);
}

// Beim ersten Start ohne eingerichtete Synchronisierung aufrufen.
export function seedDemoIfEmpty(): void {
  if (localStorage.getItem(DEMO_MARKER_KEY)) return;
  if (hasData()) return;
  loadDemoData();
}
