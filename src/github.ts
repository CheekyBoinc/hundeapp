import type { Command, DogProfile, Entry, StoolEntry, Vaccination, VetVisit, WeightEntry } from './types';
import { loadState, saveState } from './localStore';

// ===== Konfiguration =====

const CONFIG_KEY = 'hundeapp.syncConfig';
const DATA_PATH = 'daten.json';

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

  const resolveId = (id: string): string => {
    const target = alias.get(id) ?? id;
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
  const sortById = <T extends { id: string }>(arr: T[]): T[] => [...arr].sort((a, b) => a.id.localeCompare(b.id));
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
  const res = await fetch(apiBase(cfg), { headers: headers(cfg) });
  if (res.status === 404) return null;
  if (!res.ok) throw new SyncError(friendlyHttpError(res.status, await res.text()));
  const json = await res.json();
  let state: SyncState = emptyState();
  try {
    const parsed = JSON.parse(b64decode(json.content));
    state = {
      commands: Array.isArray(parsed.commands) ? parsed.commands : [],
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
      dogs: Array.isArray(parsed.dogs) ? parsed.dogs : [],
      weight: Array.isArray(parsed.weight) ? parsed.weight : [],
      stool: Array.isArray(parsed.stool) ? parsed.stool : [],
      vet: Array.isArray(parsed.vet) ? parsed.vet : [],
      vaccinations: Array.isArray(parsed.vaccinations) ? parsed.vaccinations : [],
      deleted: {
        commands: Array.isArray(parsed.deleted?.commands) ? parsed.deleted.commands : [],
        entries: Array.isArray(parsed.deleted?.entries) ? parsed.deleted.entries : [],
        dogs: Array.isArray(parsed.deleted?.dogs) ? parsed.deleted.dogs : [],
        weight: Array.isArray(parsed.deleted?.weight) ? parsed.deleted.weight : [],
        stool: Array.isArray(parsed.deleted?.stool) ? parsed.deleted.stool : [],
        vet: Array.isArray(parsed.deleted?.vet) ? parsed.deleted.vet : [],
        vaccinations: Array.isArray(parsed.deleted?.vaccinations) ? parsed.deleted.vaccinations : []
      }
    };
  } catch {
    throw new SyncError('Die Datei konnte nicht gelesen werden (Formatfehler).');
  }
  return { sha: json.sha, state };
}

async function putFile(cfg: SyncConfig, state: SyncState, sha?: string): Promise<void> {
  const body: Record<string, unknown> = {
    message: 'Hundeapp Sync',
    content: b64encode(JSON.stringify(state))
  };
  if (sha) body.sha = sha;
  const res = await fetch(apiBase(cfg), {
    method: 'PUT',
    headers: headers(cfg),
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new SyncError(friendlyHttpError(res.status, await res.text()));
}

export async function validateConfig(cfg: SyncConfig): Promise<void> {
  const res = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(cfg.user)}/${encodeURIComponent(cfg.repo)}`,
    { headers: headers(cfg) }
  );
  if (!res.ok) throw new SyncError(friendlyHttpError(res.status, await res.text()));
}

// ===== Sync-Orchestrierung =====

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

export async function pushNow(): Promise<void> {
  const cfg = getConfig();
  if (!cfg) return;

  // Bis zu 3 Versuche: Bei 409 (veralteter SHA) neu laden, erneut mergen, mit frischem SHA speichern.
  let currentRemote: { sha: string; state: SyncState } | null;
  try {
    currentRemote = await fetchFile(cfg);
  } catch (err) {
    // Kein Zugriff (offline / Kapazitätslimit): lokalen Zustand nicht verändern, still fehlschlagen.
    throw err;
  }

  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) {
      currentRemote = await fetchFile(cfg);
    }
    const remote = currentRemote?.state ?? emptyState();
    const merged = mergeStates(loadState(), remote);
    if (currentRemote && areEqual(remote, merged)) {
      // Keine Änderung gegenüber Remote – nur lokale Konvergenz sicherstellen.
      saveState(merged);
      notifyChanged();
      return;
    }
    try {
      await putFile(cfg, merged, currentRemote?.sha);
      saveState(merged);
      notifyChanged();
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
}

export async function pullNow(): Promise<SyncState> {
  const cfg = getConfig();
  if (!cfg) return loadState();
  const remoteFile = await fetchFile(cfg);
  if (!remoteFile) return loadState();
  const merged = mergeStates(loadState(), remoteFile.state);
  saveState(merged);
  notifyChanged();
  return merged;
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
