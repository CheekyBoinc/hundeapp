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
import { loadState, saveState } from './localStore';

// ===== Konfiguration =====

const CONFIG_KEY = 'hundeapp.syncConfig';
const DATA_PATH = 'daten.json';

// Praktische Obergrenze der GitHub Contents API. Die Datei wird Base64-kodiert
// in einer einzigen Anfrage übertragen; wir warnen deutlich vor dem Limit.
const MAX_PAYLOAD_BYTES = 1024 * 1024;
const WARN_PAYLOAD_BYTES = 700 * 1024;

export interface SyncConfig {
  user: string;
  repo: string;
  token: string;
}

export function getConfig(): SyncConfig | null {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    return raw ? (JSON.parse(raw) as SyncConfig) : null;
  } catch {
    return null;
  }
}

export function setConfig(cfg: SyncConfig) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
}

export function clearConfig() {
  localStorage.removeItem(CONFIG_KEY);
}

export function isConfigured(): boolean {
  const cfg = getConfig();
  return Boolean(cfg?.user && cfg?.repo && cfg?.token);
}

// ===== Fehler =====

export class SyncError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SyncError';
  }
}

function friendlyHttpError(status: number, body: string): string {
  if (status === 401 || status === 403) {
    return 'Zugriff verweigert. Bitte Zugangsdaten und Berechtigungen prüfen.';
  }
  if (status === 404) {
    return 'Repo oder Datei nicht gefunden. Ist der Repo-Name korrekt?';
  }
  if (status === 409) {
    return 'Konflikt beim Speichern – wird automatisch gelöst.';
  }
  if (status === 429) {
    return 'Zu viele Anfragen – bitte kurz warten und erneut versuchen.';
  }
  return `Fehler (HTTP ${status})${body ? ': ' + body.slice(0, 120) : ''}`;
}

// Netzwerkfehler (offline, DNS, TLS, aufgehobene Verbindung) landen nicht als
// HTTP-Status, sondern als TypeError. Hier in eine verständliche Meldung wandeln.
async function safeFetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch {
    throw new SyncError('Keine Verbindung – bitte Internetverbindung prüfen.');
  }
}

// ===== Base64 (UTF-8 sicher) =====

function b64encode(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function b64decode(s: string): string {
  const bin = atob(s.replace(/\n/g, ''));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

// ===== Zustand =====

export type SyncState = AppState;

function emptyState(): SyncState {
  return {
    commands: [],
    entries: [],
    dogs: [],
    weight: [],
    stool: [],
    vet: [],
    vaccinations: [],
    deleted: {
      commands: [],
      entries: [],
      dogs: [],
      weight: [],
      stool: [],
      vet: [],
      vaccinations: []
    }
  };
}

// ===== Schema-Validierung eingehender (Remote-)Daten =====
// Kaputte Datensätze werden verworfen statt den Sync abstürzen zu lassen.

function asRecord(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

function asString(v: unknown): string | null {
  return typeof v === 'string' ? v : null;
}

function asNumber(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function asIdList(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

function cleanList<T>(v: unknown, clean: (x: unknown) => T | null): T[] {
  if (!Array.isArray(v)) return [];
  const out: T[] = [];
  for (const item of v) {
    const cleaned = clean(item);
    if (cleaned) out.push(cleaned);
  }
  return out;
}

function withTimestamps<T extends object>(
  obj: T,
  r: Record<string, unknown>
): T & { created_at: string; updated_at?: string } {
  const created = asString(r.created_at) ?? new Date().toISOString();
  const updated = asString(r.updated_at);
  return { ...obj, created_at: created, ...(updated ? { updated_at: updated } : {}) };
}

function cleanCommand(v: unknown): Command | null {
  const r = asRecord(v);
  if (!r) return null;
  const id = asString(r.id);
  const name = asString(r.name);
  if (!id || !name) return null;
  return withTimestamps(
    {
      id,
      dogId: asString(r.dogId),
      name,
      beschreibung: asString(r.beschreibung),
      tipp: asString(r.tipp)
    },
    r
  );
}

function cleanEntry(v: unknown): Entry | null {
  const r = asRecord(v);
  if (!r) return null;
  const id = asString(r.id);
  const date = asString(r.date);
  if (!id || !date) return null;
  return withTimestamps(
    {
      id,
      dogId: asString(r.dogId),
      date,
      ort: asString(r.ort),
      was_gemacht: asString(r.was_gemacht),
      uebungsaufgaben: asString(r.uebungsaufgaben),
      tipps: asString(r.tipps),
      erledigt: r.erledigt === true,
      commands: cleanList(r.commands, cleanCommand)
    },
    r
  );
}

function cleanDog(v: unknown): DogProfile | null {
  const r = asRecord(v);
  if (!r) return null;
  const id = asString(r.id);
  const name = asString(r.name);
  if (!id || !name) return null;
  const g = asString(r.geschlecht);
  const geschlecht: DogProfile['geschlecht'] = g === 'w' || g === 'm' ? g : null;
  return withTimestamps(
    {
      id,
      name,
      rasse: asString(r.rasse),
      geburtsdatum: asString(r.geburtsdatum),
      geschlecht,
      chipNr: asString(r.chipNr),
      registerNr: asString(r.registerNr),
      tierarzt: asString(r.tierarzt),
      allergien: asString(r.allergien),
      besonderheiten: asString(r.besonderheiten)
    },
    r
  );
}

function cleanWeight(v: unknown): WeightEntry | null {
  const r = asRecord(v);
  if (!r) return null;
  const id = asString(r.id);
  const dogId = asString(r.dogId);
  const date = asString(r.date);
  const weightKg = asNumber(r.weightKg);
  if (!id || !dogId || !date || weightKg === null) return null;
  return withTimestamps({ id, dogId, date, weightKg, note: asString(r.note) }, r);
}

function cleanStool(v: unknown): StoolEntry | null {
  const r = asRecord(v);
  if (!r) return null;
  const id = asString(r.id);
  const dogId = asString(r.dogId);
  const date = asString(r.date);
  if (!id || !dogId || !date) return null;
  const amount = asString(r.amount);
  const amountValue: StoolEntry['amount'] =
    amount === 'wenig' || amount === 'normal' || amount === 'viel' ? amount : null;
  return withTimestamps(
    {
      id,
      dogId,
      date,
      consistency: asNumber(r.consistency) ?? 0,
      color: asString(r.color),
      amount: amountValue,
      abnormal: r.abnormal === true,
      note: asString(r.note)
    },
    r
  );
}

function cleanVet(v: unknown): VetVisit | null {
  const r = asRecord(v);
  if (!r) return null;
  const id = asString(r.id);
  const dogId = asString(r.dogId);
  const date = asString(r.date);
  if (!id || !dogId || !date) return null;
  return withTimestamps(
    {
      id,
      dogId,
      date,
      clinic: asString(r.clinic),
      reason: asString(r.reason),
      diagnosis: asString(r.diagnosis),
      treatment: asString(r.treatment),
      medication: asString(r.medication),
      followUp: asString(r.followUp),
      note: asString(r.note)
    },
    r
  );
}

function cleanVaccination(v: unknown): Vaccination | null {
  const r = asRecord(v);
  if (!r) return null;
  const id = asString(r.id);
  const dogId = asString(r.dogId);
  const date = asString(r.date);
  const name = asString(r.name);
  if (!id || !dogId || !date || !name) return null;
  return withTimestamps(
    { id, dogId, date, name, nextDue: asString(r.nextDue), note: asString(r.note) },
    r
  );
}

export function sanitizeState(parsed: unknown): SyncState {
  const p = asRecord(parsed) ?? {};
  const d = asRecord(p.deleted) ?? {};
  return {
    commands: cleanList(p.commands, cleanCommand),
    entries: cleanList(p.entries, cleanEntry),
    dogs: cleanList(p.dogs, cleanDog),
    weight: cleanList(p.weight, cleanWeight),
    stool: cleanList(p.stool, cleanStool),
    vet: cleanList(p.vet, cleanVet),
    vaccinations: cleanList(p.vaccinations, cleanVaccination),
    deleted: {
      commands: asIdList(d.commands),
      entries: asIdList(d.entries),
      dogs: asIdList(d.dogs),
      weight: asIdList(d.weight),
      stool: asIdList(d.stool),
      vet: asIdList(d.vet),
      vaccinations: asIdList(d.vaccinations)
    }
  };
}

// ===== Merge =====

function stampOf(x: { created_at: string; updated_at?: string }): string {
  return x.updated_at ?? x.created_at;
}

export function mergeStates(local: SyncState, remote: SyncState): SyncState {
  // Tombstones: wurde etwas auf einer Seite gelöscht, bleibt es gelöscht.
  const dCommands = new Set([...local.deleted.commands, ...remote.deleted.commands]);
  const dEntries = new Set([...local.deleted.entries, ...remote.deleted.entries]);

  // Kommandos zusammenführen.
  // Primärschlüssel: ID. Wenn zwei Geräte dasselbe Kommando mit gleichem Namen
  // aber verschiedener ID anlegen, gewinnt das neuere; die ältere ID wird verworfen
  // und Einträge, die sie referenzieren, werden auf den Gewinner umgelenkt.
  const byId = new Map<string, Command>();
  const alias = new Map<string, string>();

  const put = (c: Command) => {
    const cur = byId.get(c.id);
    if (!cur || stampOf(c) > stampOf(cur)) byId.set(c.id, c);
  };

  const commands = [...local.commands, ...remote.commands];
  const byLowerName = new Map<string, Command>();
  for (const c of commands) {
    const key = c.name.trim().toLowerCase();
    const clash = byLowerName.get(key);
    if (clash && clash.id !== c.id) {
      const winner = stampOf(c) > stampOf(clash) ? c : clash;
      const loser = winner.id === c.id ? clash : c;
      // Loser-ID verwerfen und auf Gewinner umleiten (verhindert Duplikate)
      byLowerName.set(key, winner);
      byId.set(winner.id, winner);
      byId.delete(loser.id);
      alias.set(loser.id, winner.id);
    } else {
      byLowerName.set(key, c);
      put(c);
    }
  }

  const finalCommands = [...byId.values()].filter((c) => !dCommands.has(c.id));

  // Alias-Ketten transitiv auflösen (A→B, B→C wird zu A→C), Zyklen abgesichert.
  const resolveId = (id: string): string => {
    let target = id;
    const seen = new Set<string>([id]);
    while (alias.has(target)) {
      const next = alias.get(target) as string;
      if (seen.has(next)) break;
      seen.add(next);
      target = next;
    }
    return dCommands.has(target) ? id : target;
  };

  // Einträge zusammenführen: pro ID gewinnt der neuere Stand.
  const entryMap = new Map<string, Entry>();
  for (const e of [...local.entries, ...remote.entries]) {
    const cur = entryMap.get(e.id);
    if (!cur || stampOf(e) > stampOf(cur)) entryMap.set(e.id, e);
  }

  const finalEntries = [...entryMap.values()]
    .filter((e) => !dEntries.has(e.id))
    .map((e) => ({
      ...e,
      commands: e.commands
        .map((c) => {
          const target = byId.get(resolveId(c.id));
          return target && !dCommands.has(target.id) ? target : undefined;
        })
        .filter((x): x is Command => Boolean(x))
    }));

  // Generisches Zusammenführen von Listen pro ID; neuerer Stand gewinnt.
  const mergeList = <T extends { id: string; created_at: string; updated_at?: string }>(
    localList: T[],
    remoteList: T[],
    tomb: Set<string>
  ): T[] => {
    const map = new Map<string, T>();
    for (const item of [...localList, ...remoteList]) {
      const cur = map.get(item.id);
      if (!cur || stampOf(item) > stampOf(cur)) map.set(item.id, item);
    }
    return [...map.values()].filter((x) => !tomb.has(x.id));
  };

  const dDogs = new Set([...local.deleted.dogs, ...remote.deleted.dogs]);
  const dWeight = new Set([...local.deleted.weight, ...remote.deleted.weight]);
  const dStool = new Set([...local.deleted.stool, ...remote.deleted.stool]);
  const dVet = new Set([...local.deleted.vet, ...remote.deleted.vet]);
  const dVax = new Set([...local.deleted.vaccinations, ...remote.deleted.vaccinations]);

  return {
    commands: finalCommands,
    entries: finalEntries,
    dogs: mergeList(local.dogs, remote.dogs, dDogs),
    weight: mergeList(local.weight, remote.weight, dWeight),
    stool: mergeList(local.stool, remote.stool, dStool),
    vet: mergeList(local.vet, remote.vet, dVet),
    vaccinations: mergeList(local.vaccinations, remote.vaccinations, dVax),
    deleted: {
      commands: [...dCommands],
      entries: [...dEntries],
      dogs: [...dDogs],
      weight: [...dWeight],
      stool: [...dStool],
      vet: [...dVet],
      vaccinations: [...dVax]
    }
  };
}

export function areEqual(a: SyncState, b: SyncState): boolean {
  return JSON.stringify(normalize(a)) === JSON.stringify(normalize(b));
}

function normalize(s: SyncState): SyncState {
  const sortById = <T extends { id: string }>(arr: T[]): T[] =>
    [...arr].sort((a, b) => a.id.localeCompare(b.id));
  return {
    commands: sortById(s.commands),
    entries: sortById(s.entries),
    dogs: sortById(s.dogs),
    weight: sortById(s.weight),
    stool: sortById(s.stool),
    vet: sortById(s.vet),
    vaccinations: sortById(s.vaccinations),
    deleted: {
      commands: [...s.deleted.commands].sort(),
      entries: [...s.deleted.entries].sort(),
      dogs: [...s.deleted.dogs].sort(),
      weight: [...s.deleted.weight].sort(),
      stool: [...s.deleted.stool].sort(),
      vet: [...s.deleted.vet].sort(),
      vaccinations: [...s.deleted.vaccinations].sort()
    }
  };
}

// ===== Tombstone-Aufräumung =====
// Grundproblem: Tombstones wirklich gelöschter Objekte sind NICHT sicher zu
// entfernen, solange ein Gerät die Löschung noch nicht gesehen hat – ein
// Offline-Gerät würde das Objekt sonst beim nächsten Merge wiederbeleben.
// Ohne Gerätetracking kann man sie daher nicht aggregiert löschen.
//
// Sichere, wirksame Teilmenge: Wir bereinigen nur Tombstones, die nachweislich
// wirkungslos sind. Das sind Einträge, deren Objekt noch als aktiv in der
// Live-Liste existiert (inkonsistenter Zustand, z. B. durch doppeltes Anlegen),
// sowie Duplikate in den Listen selbst. Echte Lösch-Vermerke bleiben erhalten.
export function pruneStaleTombstones(state: SyncState): SyncState {
  const liveIds = (list: { id: string }[]) => new Set(list.map((x) => x.id));
  const live = {
    commands: liveIds(state.commands),
    entries: liveIds(state.entries),
    dogs: liveIds(state.dogs),
    weight: liveIds(state.weight),
    stool: liveIds(state.stool),
    vet: liveIds(state.vet),
    vaccinations: liveIds(state.vaccinations)
  };

  const dedupe = (list: string[]) => [...new Set(list)];
  const prune = (tomb: string[], liveSet: Set<string>) =>
    dedupe(tomb.filter((id) => !liveSet.has(id)));

  return {
    ...state,
    deleted: {
      commands: prune(state.deleted.commands, live.commands),
      entries: prune(state.deleted.entries, live.entries),
      dogs: prune(state.deleted.dogs, live.dogs),
      weight: prune(state.deleted.weight, live.weight),
      stool: prune(state.deleted.stool, live.stool),
      vet: prune(state.deleted.vet, live.vet),
      vaccinations: prune(state.deleted.vaccinations, live.vaccinations)
    }
  };
}

// ===== GitHub API =====

function apiBase(cfg: SyncConfig): string {
  return `https://api.github.com/repos/${encodeURIComponent(cfg.user)}/${encodeURIComponent(
    cfg.repo
  )}/contents/${DATA_PATH}`;
}

function headers(cfg: SyncConfig): Record<string, string> {
  return {
    Authorization: `Bearer ${cfg.token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };
}

async function fetchFile(cfg: SyncConfig): Promise<{ sha: string; state: SyncState } | null> {
  const res = await safeFetch(apiBase(cfg), { headers: headers(cfg) });
  if (res.status === 404) return null;
  if (!res.ok) throw new SyncError(friendlyHttpError(res.status, await res.text()));
  const json = await res.json();
  let state: SyncState;
  try {
    state = sanitizeState(JSON.parse(b64decode(json.content)));
  } catch {
    throw new SyncError('Die Datei konnte nicht gelesen werden (Formatfehler).');
  }
  return { sha: json.sha, state };
}

async function putFile(cfg: SyncConfig, state: SyncState, sha?: string): Promise<void> {
  const content = b64encode(JSON.stringify(state));
  // Base64 bläht um ~33 % auf; die Größenangabe der Contents API bezieht sich
  // auf den codierten Inhalt. Wir messen daher den codierten String.
  const bytes = content.length;
  if (bytes > MAX_PAYLOAD_BYTES) {
    throw new SyncError(
      'Die Daten sind zu groß (> 1 MB) für eine einzelne Datei. Bitte Datenbestand bereinigen.'
    );
  }
  if (bytes > WARN_PAYLOAD_BYTES) {
    console.warn(
      `Hundeapp Sync: Die Daten sind mit ${(bytes / 1024).toFixed(0)} KB fast am 1-MB-Limit. Bitte bereinigen.`
    );
  }
  const body: Record<string, unknown> = {
    message: 'Hundeapp Sync',
    content
  };
  if (sha) body.sha = sha;
  const res = await safeFetch(apiBase(cfg), {
    method: 'PUT',
    headers: headers(cfg),
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new SyncError(friendlyHttpError(res.status, await res.text()));
}

export async function validateConfig(cfg: SyncConfig): Promise<void> {
  const res = await safeFetch(
    `https://api.github.com/repos/${encodeURIComponent(cfg.user)}/${encodeURIComponent(cfg.repo)}`,
    { headers: headers(cfg) }
  );
  if (!res.ok) throw new SyncError(friendlyHttpError(res.status, await res.text()));
}

// ===== Sync-Orchestrierung =====
// Alle Sync-Läufe werden serialisiert, damit sich Push und Pull nie überlappen.

let syncChain: Promise<void> = Promise.resolve();

function serialize<T>(fn: () => Promise<T>): Promise<T> {
  const result = syncChain.then(fn);
  syncChain = result.then(
    () => undefined,
    () => undefined
  );
  return result;
}

let pushTimer: ReturnType<typeof setTimeout> | undefined;

export function schedulePush() {
  if (!isConfigured()) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushNow().catch(() => {
      /* still – nächste Änderung oder manueller Pull versucht es erneut */
    });
  }, 1200);
}

// Nach dem Netzwerk-Roundtrip den aktuellen lokalen Stand erneut einmischen,
// damit Änderungen, die während des Requests entstanden sind, nicht verloren gehen.
function persistMerged(pushed: SyncState): void {
  const merged = pruneStaleTombstones(mergeStates(loadState(), pushed));
  saveState(merged);
  notifyChanged();
}

export async function pushNow(): Promise<void> {
  return serialize(async () => {
    const cfg = getConfig();
    if (!cfg) return;

    // Bis zu 3 Versuche: Bei 409 (veralteter SHA) neu laden, erneut mergen, mit frischem SHA speichern.
    let currentRemote = await fetchFile(cfg);
    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) {
        currentRemote = await fetchFile(cfg);
      }
      const remote = currentRemote?.state ?? emptyState();
      const merged = mergeStates(loadState(), remote);
      if (currentRemote && areEqual(remote, merged)) {
        // Keine Änderung gegenüber Remote – nur lokale Konvergenz sicherstellen.
        persistMerged(merged);
        return;
      }
      try {
        await putFile(cfg, merged, currentRemote?.sha);
        persistMerged(merged);
        return;
      } catch (err) {
        lastError = err;
        if (err instanceof SyncError && /409|Conflict|Konflikt/i.test(err.message)) {
          continue; // SHA-Konflikt -> neu laden und erneut versuchen
        }
        throw err;
      }
    }
    throw lastError;
  });
}

export async function pullNow(): Promise<SyncState> {
  return serialize(async () => {
    const cfg = getConfig();
    if (!cfg) return loadState();
    const remoteFile = await fetchFile(cfg);
    if (!remoteFile) return loadState();
    const merged = pruneStaleTombstones(mergeStates(loadState(), remoteFile.state));
    saveState(merged);
    notifyChanged();
    return merged;
  });
}

// ===== Change-Events =====

type Listener = () => void;
const listeners = new Set<Listener>();

export function onChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notifyChanged() {
  for (const fn of listeners) fn();
}
