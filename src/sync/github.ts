import { Preferences } from '@capacitor/preferences';
import { readStored, removeStored, writeStored } from './secureStore';
import { notifyNotice, sanitizeState } from './core';
import { SyncConflictError, SyncError, type SyncBackend, type SyncState } from './types';

// Transport und Konfiguration für den Abgleich über ein privates GitHub-Repo.
// Der gesamte Ablauf (Zusammenführen, Konflikte, Ereignisse) liegt in ./core.
//
// Token und Repo-Daten liegen nativ in der sicheren Ablage des Systems, im
// Browser im localStorage über Capacitor Preferences. Der Zugriff im Code
// bleibt synchron über einen Cache, der einmalig beim Start per initConfig()
// gefüllt wird. Ältere Stände (Preferences, davor localStorage) werden beim
// ersten Start übernommen.

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

let configCache: SyncConfig | null = null;

function parseConfig(raw: string | null | undefined): SyncConfig | null {
  if (!raw) return null;
  try {
    const cfg = JSON.parse(raw) as Partial<SyncConfig>;
    return cfg &&
      typeof cfg.user === 'string' &&
      typeof cfg.repo === 'string' &&
      typeof cfg.token === 'string'
      ? { user: cfg.user, repo: cfg.repo, token: cfg.token }
      : null;
  } catch {
    return null;
  }
}

// Einmalig vor dem ersten Render aufrufen (über initSync in ./index).
export async function initConfig(): Promise<void> {
  let cfg = await readStored(CONFIG_KEY)
    .then(parseConfig)
    .catch(() => null);
  // Migration 2: Versionen 1.0 bis 1.2.3 haben nativ in Preferences gespeichert.
  if (!cfg) {
    const previous = parseConfig((await Preferences.get({ key: CONFIG_KEY })).value);
    if (previous) {
      cfg = previous;
      await writeStored(CONFIG_KEY, JSON.stringify(previous)).catch(() => undefined);
      await Preferences.remove({ key: CONFIG_KEY }).catch(() => undefined);
    }
  }
  // Migration 1: Die Web-Version hat die Konfiguration anfangs direkt im localStorage abgelegt.
  if (!cfg) {
    const legacy = parseConfig(localStorage.getItem(CONFIG_KEY));
    if (legacy) {
      cfg = legacy;
      await writeStored(CONFIG_KEY, JSON.stringify(legacy)).catch(() => undefined);
      localStorage.removeItem(CONFIG_KEY);
    }
  }
  configCache = cfg;
}

export function getConfig(): SyncConfig | null {
  return configCache;
}

export function setConfig(cfg: SyncConfig) {
  configCache = cfg;
  void writeStored(CONFIG_KEY, JSON.stringify(cfg)).catch(() => undefined);
}

export function clearConfig() {
  configCache = null;
  void removeStored(CONFIG_KEY).catch(() => undefined);
}

export function isConfigured(): boolean {
  const cfg = getConfig();
  return Boolean(cfg?.user && cfg?.repo && cfg?.token);
}

function friendlyHttpError(status: number): string {
  if (status === 401 || status === 403) {
    return 'Zugriff verweigert. Bitte Zugangsdaten und Berechtigungen prüfen.';
  }
  if (status === 404) {
    return 'Repo oder Datei nicht gefunden. Ist der Repo-Name korrekt?';
  }
  if (status === 429) {
    return 'Zu viele Anfragen – bitte kurz warten und erneut versuchen.';
  }
  return `Unerwarteter Fehler (HTTP ${status}). Bitte später erneut versuchen.`;
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
  if (!res.ok) throw new SyncError(friendlyHttpError(res.status));
  const json = await res.json();
  let state: SyncState;
  try {
    state = sanitizeState(JSON.parse(b64decode(json.content)));
  } catch {
    throw new SyncError('Die Datei konnte nicht gelesen werden (Formatfehler).');
  }
  return { sha: json.sha, state };
}

// Speichert und gibt die neue Revision (GitHubs sha) zurück.
async function putFile(cfg: SyncConfig, state: SyncState, sha?: string): Promise<string> {
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
    notifyNotice(
      `Die Sync-Datei ist mit ${(bytes / 1024).toFixed(0)} KB nahe am Limit von 1 MB. Alte Einträge löschen oder eine Sicherung anlegen.`
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
  if (res.status === 409) {
    throw new SyncConflictError('Konflikt beim Speichern – wird automatisch gelöst.');
  }
  if (!res.ok) throw new SyncError(friendlyHttpError(res.status));
  const json = (await res.json().catch(() => null)) as { content?: { sha?: string } } | null;
  return json?.content?.sha ?? sha ?? '';
}

export async function validateConfig(cfg: SyncConfig): Promise<void> {
  const res = await safeFetch(
    `https://api.github.com/repos/${encodeURIComponent(cfg.user)}/${encodeURIComponent(cfg.repo)}`,
    { headers: headers(cfg) }
  );
  if (!res.ok) throw new SyncError(friendlyHttpError(res.status));
}

// ===== Backend =====

export const githubBackend: SyncBackend = {
  id: 'github',
  isConfigured,
  // GitHub kennt keine Revisionsmarke: knownRev wird ignoriert, es kommt nie
  // 'unchanged' zurück.
  fetch: async () => {
    const cfg = getConfig();
    if (!cfg) return null;
    const file = await fetchFile(cfg);
    return file ? { rev: file.sha, state: file.state } : null;
  },
  put: async (state, rev) => {
    const cfg = getConfig();
    if (!cfg) throw new SyncError('Keine Synchronisierung eingerichtet.');
    return putFile(cfg, state, rev);
  },
  clear: async () => {
    clearConfig();
  }
};
