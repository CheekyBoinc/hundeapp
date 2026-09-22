import type { AppState, Entry } from './types';
import { loadState } from './localStore';
import { mergeIntoLocal, sanitizeState, schedulePush } from './sync';
import { readFileAsText, saveFile } from './files';
import { todayLocal } from './utils';

// Sicherung als Datei: alle Daten der App als JSON. Dient dem Handywechsel
// und dem Weitergeben an ein zweites Gerät ohne GitHub-Konto.

interface BackupFile {
  app: 'hundeapp';
  version: 1;
  exportedAt: string;
  data: AppState;
}

interface BackupCounts {
  entries: number;
  commands: number;
  dogs: number;
  ignored: number;
}

export interface ImportPreview {
  neu: number;
  aktualisiert: number;
  loescht: number;
}

// Grenzen für eingespielte Sicherungen. Sie gelten nur beim Import: Ein Gerät
// mit falsch gestellter Uhr ist harmlos, im Abgleich würde ein Verwerfen
// dagegen echte Daten kosten. Datensätze mit unplausiblen Angaben fallen
// deshalb hier weg, nicht im Sync.
const MAX_BACKUP_BYTES = 5 * 1024 * 1024;
const MAX_TOMBSTONES_PER_LIST = 5000;
const MAX_ID_LENGTH = 100;
const MAX_TEXT_LENGTH = 20000;
const MAX_CLOCK_AHEAD_MS = 24 * 60 * 60 * 1000;

const STATE_KEYS = ['commands', 'entries', 'dogs', 'weight', 'stool', 'vet', 'vaccinations'];

interface Stamped {
  id: string;
  created_at: string;
  updated_at?: string;
}

interface Cleaned<T> {
  kept: T[];
  ignored: number;
}

function buildBackup(): BackupFile {
  return { app: 'hundeapp', version: 1, exportedAt: new Date().toISOString(), data: loadState() };
}

function backupFilename(): string {
  return `hundeapp-sicherung-${todayLocal()}.json`;
}

// Zeitstempel weit in der Zukunft würden bei jeder Zusammenführung gewinnen
// und sich über den Abgleich auf alle Geräte verteilen.
function plausibleStamp(value: unknown): boolean {
  if (value === undefined) return true;
  if (typeof value !== 'string') return false;
  const time = Date.parse(value);
  return !Number.isNaN(time) && time <= Date.now() + MAX_CLOCK_AHEAD_MS;
}

function plausibleRecord(record: Record<string, unknown>): boolean {
  if (typeof record.id !== 'string' || record.id.length > MAX_ID_LENGTH) return false;
  if (!plausibleStamp(record.created_at) || !plausibleStamp(record.updated_at)) return false;
  for (const [key, value] of Object.entries(record)) {
    // Verschachtelte Kommandos prüft der Eintrag selbst; das Hundefoto hat
    // seine eigene Prüfung in cleanDog.
    if (key === 'commands' || key === 'photo') continue;
    if (typeof value === 'string' && value.length > MAX_TEXT_LENGTH) return false;
  }
  return true;
}

function keepPlausible<T extends Stamped>(items: T[]): Cleaned<T> {
  const kept: T[] = [];
  let ignored = 0;
  for (const item of items) {
    if (plausibleRecord(item as unknown as Record<string, unknown>)) kept.push(item);
    else ignored += 1;
  }
  return { kept, ignored };
}

// Einträge tragen ihre Kommandos mit. Ein unplausibles Kommando fällt einzeln
// weg, der Eintrag bleibt.
function cleanEntries(entries: Entry[]): Cleaned<Entry> {
  const kept: Entry[] = [];
  let ignored = 0;
  for (const entry of entries) {
    if (!plausibleRecord(entry as unknown as Record<string, unknown>)) {
      ignored += 1;
      continue;
    }
    const commands = keepPlausible(entry.commands);
    ignored += commands.ignored;
    kept.push(
      commands.kept.length === entry.commands.length ? entry : { ...entry, commands: commands.kept }
    );
  }
  return { kept, ignored };
}

// Löschvermerke laufen nie ab; sie halten eine Löschung auf allen Geräten
// fest. Eine gekürzte Liste würde gelöschte Datensätze zurückholen, deshalb
// wird die Datei bei einer überlangen Liste als Ganzes abgelehnt. Einzelne
// überlange IDs können dagegen keinen echten Datensatz treffen und fallen weg.
function cleanTombstones(deleted: AppState['deleted']): {
  deleted: AppState['deleted'];
  ignored: number;
} {
  let ignored = 0;
  const lists = Object.entries(deleted).map(([key, ids]) => {
    const kept = ids.filter((id) => {
      if (id.length <= MAX_ID_LENGTH) return true;
      ignored += 1;
      return false;
    });
    if (kept.length > MAX_TOMBSTONES_PER_LIST) {
      throw new Error(
        'Die Datei enthält ungewöhnlich viele Löschvermerke und wird nicht eingespielt.'
      );
    }
    return [key, kept] as const;
  });
  return { deleted: Object.fromEntries(lists) as AppState['deleted'], ignored };
}

// Akzeptiert die Sicherungsdatei (mit Kopf) und zur Sicherheit auch das rohe
// Datenformat, wie es im GitHub-Repo liegt.
export function parseBackup(text: string): { state: AppState; counts: BackupCounts } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Die Datei ist kein gültiges JSON.');
  }
  const obj =
    parsed !== null && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  if (!obj) throw new Error('Die Datei ist keine Hundeapp-Sicherung.');

  const raw = obj.app === 'hundeapp' && obj.data && typeof obj.data === 'object' ? obj.data : obj;
  const rawObj = raw as Record<string, unknown>;
  if (!STATE_KEYS.some((k) => Array.isArray(rawObj[k]))) {
    throw new Error('Die Datei ist keine Hundeapp-Sicherung.');
  }

  const cleaned = sanitizeState(raw);
  const commands = keepPlausible(cleaned.commands);
  const entries = cleanEntries(cleaned.entries);
  const dogs = keepPlausible(cleaned.dogs);
  const weight = keepPlausible(cleaned.weight);
  const stool = keepPlausible(cleaned.stool);
  const vet = keepPlausible(cleaned.vet);
  const vaccinations = keepPlausible(cleaned.vaccinations);
  const tombstones = cleanTombstones(cleaned.deleted);

  const state: AppState = {
    commands: commands.kept,
    entries: entries.kept,
    dogs: dogs.kept,
    weight: weight.kept,
    stool: stool.kept,
    vet: vet.kept,
    vaccinations: vaccinations.kept,
    deleted: tombstones.deleted
  };

  const ignored =
    commands.ignored +
    entries.ignored +
    dogs.ignored +
    weight.ignored +
    stool.ignored +
    vet.ignored +
    vaccinations.ignored +
    tombstones.ignored;

  return {
    state,
    counts: {
      entries: state.entries.length,
      commands: state.commands.length,
      dogs: state.dogs.length,
      ignored
    }
  };
}

export async function exportBackup(): Promise<void> {
  await saveFile(backupFilename(), JSON.stringify(buildBackup(), null, 2), 'application/json');
}

export async function readBackupFile(
  file: File
): Promise<{ state: AppState; counts: BackupCounts }> {
  if (file.size > MAX_BACKUP_BYTES) {
    throw new Error('Die Datei ist zu groß für eine Hundeapp-Sicherung.');
  }
  return parseBackup(await readFileAsText(file));
}

// Führt die Sicherung mit den vorhandenen Daten zusammen (bei gleicher ID
// gewinnt der neuere Stand) und stößt den Sync an, falls eingerichtet.
export function importBackup(state: AppState): void {
  mergeIntoLocal(state);
  schedulePush();
}

function stampOf(item: Stamped): string {
  return item.updated_at ?? item.created_at;
}

interface AreaCount {
  neu: number;
  aktualisiert: number;
  loescht: number;
}

function countArea(
  incoming: Stamped[],
  current: Stamped[],
  dead: Set<string>,
  tombstones: string[]
): AreaCount {
  const byId = new Map(current.map((item) => [item.id, item]));
  let neu = 0;
  let aktualisiert = 0;
  for (const item of incoming) {
    // Vermerkte IDs bleiben gelöscht, auch wenn die Sicherung sie noch enthält.
    if (dead.has(item.id)) continue;
    const existing = byId.get(item.id);
    if (!existing) neu += 1;
    else if (stampOf(item) > stampOf(existing)) aktualisiert += 1;
  }
  const live = new Set(current.map((item) => item.id));
  const loescht = new Set(tombstones.filter((id) => live.has(id))).size;
  return { neu, aktualisiert, loescht };
}

// Was das Einspielen bewirkt, bevor es passiert. Gezählt wird pro ID wie in
// mergeStates; die Umlenkung gleichnamiger Kommandos bleibt außen vor, sie
// verschiebt nur wenige Datensätze und ändert nichts an der Aussage.
export function previewImport(state: AppState): ImportPreview {
  const local = loadState();
  const dead = new Set([
    ...Object.values(local.deleted).flat(),
    ...Object.values(state.deleted).flat()
  ]);
  const areas = [
    countArea(state.commands, local.commands, dead, state.deleted.commands),
    countArea(state.entries, local.entries, dead, state.deleted.entries),
    countArea(state.dogs, local.dogs, dead, state.deleted.dogs),
    countArea(state.weight, local.weight, dead, state.deleted.weight),
    countArea(state.stool, local.stool, dead, state.deleted.stool),
    countArea(state.vet, local.vet, dead, state.deleted.vet),
    countArea(state.vaccinations, local.vaccinations, dead, state.deleted.vaccinations)
  ];
  return areas.reduce<ImportPreview>(
    (sum, area) => ({
      neu: sum.neu + area.neu,
      aktualisiert: sum.aktualisiert + area.aktualisiert,
      loescht: sum.loescht + area.loescht
    }),
    { neu: 0, aktualisiert: 0, loescht: 0 }
  );
}

export function formatCounts(c: BackupCounts): string {
  const parts = [
    `${c.entries} ${c.entries === 1 ? 'Eintrag' : 'Einträge'}`,
    `${c.commands} ${c.commands === 1 ? 'Kommando' : 'Kommandos'}`,
    `${c.dogs} ${c.dogs === 1 ? 'Hund' : 'Hunde'}`
  ];
  return parts.join(', ');
}

// Text für die Rückfrage vor dem Einspielen. Er nennt, was die Datei enthält,
// was sich dadurch ändert und was übersprungen wurde.
export function formatImportSummary(counts: BackupCounts, preview: ImportPreview): string {
  const parts = [`Die Datei enthält ${formatCounts(counts)}.`];
  if (preview.neu > 0) {
    parts.push(preview.neu === 1 ? '1 Datensatz ist neu.' : `${preview.neu} Datensätze sind neu.`);
  }
  if (preview.aktualisiert > 0) {
    parts.push(
      preview.aktualisiert === 1
        ? '1 Datensatz ersetzt einen älteren Stand auf diesem Gerät.'
        : `${preview.aktualisiert} Datensätze ersetzen einen älteren Stand auf diesem Gerät.`
    );
  }
  if (preview.loescht > 0) {
    parts.push(
      preview.loescht === 1
        ? '1 Löschvermerk aus der Datei entfernt einen Datensatz auf diesem Gerät.'
        : `${preview.loescht} Löschvermerke aus der Datei entfernen Datensätze auf diesem Gerät.`
    );
  }
  if (counts.ignored > 0) {
    parts.push(
      counts.ignored === 1
        ? '1 Datensatz wurde übersprungen, weil die Angaben unplausibel sind.'
        : `${counts.ignored} Datensätze wurden übersprungen, weil die Angaben unplausibel sind.`
    );
  }
  parts.push('Fortfahren?');
  return parts.join(' ');
}
