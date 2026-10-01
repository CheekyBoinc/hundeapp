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

interface SyncConfig {
  user: string;
  repo: string;
  token: string;
}

let configCache: SyncConfig | null = null;

// Zuletzt gesehener Stand auf dem Server: GitHubs Blob-sha und der ETag der
// Antwort. Mit beidem fragt der Abruf bedingt an und bekommt bei unverändertem
// Stand eine 304 ohne Daten. Beides liegt nur im Speicher.
let knownSha: string | null = null;
let knownEtag: string | null = null;

function forgetRemoteMarkers(): void {
  knownSha = null;
  knownEtag = null;
}

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

function getConfig(): SyncConfig | null {
  return configCache;
}

export function setConfig(cfg: SyncConfig) {
  configCache = cfg;
  forgetRemoteMarkers();
  void writeStored(CONFIG_KEY, JSON.stringify(cfg)).catch(() => undefined);
}

export function clearConfig() {
  configCache = null;
  forgetRemoteMarkers();
  void removeStored(CONFIG_KEY).catch(() => undefined);
}

function isConfigured(): boolean {
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

async function fetchFile(
  cfg: SyncConfig,
  knownRev?: string
): Promise<{ sha: string; state: SyncState } | 'unchanged' | null> {
  // GitHub darf Antworten 60 Sekunden zwischenspeichern (Cache-Control);
  // ein Abruf für den Abgleich darf aber nie aus dem Cache kommen.
  // Bedingt nur, wenn ein ETag vorliegt und der Aufrufer genau den Stand kennt,
  // den wir zuletzt gesehen haben. If-None-Match gehört nur hierher: Der PUT
  // darf den Header nicht tragen, sonst könnte er mit 412 scheitern.
  const kopf: Record<string, string> = headers(cfg);
  const bedingt = knownEtag !== null && knownRev !== undefined && knownRev === knownSha;
  if (bedingt && knownEtag) kopf['If-None-Match'] = knownEtag;
  let res: Response;
  try {
    res = await safeFetch(apiBase(cfg), { headers: kopf, cache: 'no-store' });
  } catch (err) {
    // Die bedingte Anfrage hat nicht getragen: nächstes Mal wieder ohne.
    knownEtag = null;
    throw err;
  }
  // 304 ist nicht res.ok und wird deshalb vor der Fehlerbehandlung geprüft.
  if (res.status === 304) return 'unchanged';
  if (res.status === 404) return null;
  if (!res.ok) {
    knownEtag = null;
    throw new SyncError(friendlyHttpError(res.status));
  }
  const json = await res.json();
  let state: SyncState;
  try {
    state = sanitizeState(JSON.parse(b64decode(json.content)));
  } catch {
    knownEtag = null;
    throw new SyncError('Die Datei konnte nicht gelesen werden (Formatfehler).');
  }
  knownSha = json.sha;
  // Ohne ETag bleibt er leer; dann fragt der nächste Abruf ohne Bedingung.
  knownEtag = res.headers.get('ETag');
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
  const neueRev = json?.content?.sha ?? sha ?? '';
  // Der Blob-sha hängt am Inhalt, deshalb passt der ETag immer dazu: Eine 304
  // kommt nur, wenn der Server genau auf diesem Inhalt steht.
  knownSha = neueRev || null;
  knownEtag = neueRev ? `"${neueRev}"` : null;
  return neueRev;
}

export async function validateConfig(cfg: SyncConfig): Promise<void> {
  const res = await safeFetch(
    `https://api.github.com/repos/${encodeURIComponent(cfg.user)}/${encodeURIComponent(cfg.repo)}`,
    { headers: headers(cfg), cache: 'no-store' }
  );
  if (!res.ok) throw new SyncError(friendlyHttpError(res.status));
}

// ===== Backend =====

export const githubBackend: SyncBackend = {
  id: 'github',
  isConfigured,
  // Bedingte Anfrage: Kennt der Aufrufer den zuletzt gesehenen sha und liegt ein
  // ETag vor, antwortet GitHub bei unverändertem Stand mit 304 statt mit Daten.
  fetch: async (knownRev) => {
    const cfg = getConfig();
    if (!cfg) return null;
    const file = await fetchFile(cfg, knownRev);
    if (file === 'unchanged') return 'unchanged';
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
