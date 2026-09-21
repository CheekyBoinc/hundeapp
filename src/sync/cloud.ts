import { sanitizeState } from './core';
import { SyncConflictError, SyncError, type SyncBackend, type SyncState } from './types';
import { readStored, removeStored, writeStored } from './secureStore';

// Zweiter Sync-Weg: Abgleich über den Dienst, Anmeldung mit einem Code per
// E-Mail. Bewusst ohne fremde Bibliothek – die wenigen Aufrufe gehen direkt an
// die Auth-, REST- und Funktionsschnittstelle von Supabase.

const SESSION_KEY = 'hundeapp.cloudSession';

const baseUrl = import.meta.env.VITE_SUPABASE_URL;
const publicKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Ohne Zugangsdaten oder ohne ausdrückliche Freigabe erscheint der Dienst
// nirgends in der Oberfläche.
export const cloudAvailable = Boolean(
  baseUrl && publicKey && import.meta.env.VITE_CLOUD_SYNC === '1'
);

interface Session {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  userId: string;
  email: string;
}

let session: Session | null = null;
let loaded = false;

function parseSession(raw: string | null): Session | null {
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as Partial<Session>;
    return typeof s.accessToken === 'string' &&
      typeof s.refreshToken === 'string' &&
      typeof s.userId === 'string' &&
      typeof s.email === 'string' &&
      typeof s.expiresAt === 'number'
      ? {
          accessToken: s.accessToken,
          refreshToken: s.refreshToken,
          expiresAt: s.expiresAt,
          userId: s.userId,
          email: s.email
        }
      : null;
  } catch {
    return null;
  }
}

async function loadSession(): Promise<Session | null> {
  if (!loaded) {
    session = parseSession(await readStored(SESSION_KEY).catch(() => null));
    loaded = true;
  }
  return session;
}

async function saveSession(next: Session | null): Promise<void> {
  session = next;
  loaded = true;
  if (next) await writeStored(SESSION_KEY, JSON.stringify(next)).catch(() => undefined);
  else await removeStored(SESSION_KEY).catch(() => undefined);
}

function requireConfig(): { url: string; key: string } {
  if (!baseUrl || !publicKey) throw new SyncError('Der Dienst ist nicht eingerichtet.');
  return { url: baseUrl, key: publicKey };
}

async function api(path: string, init: RequestInit = {}, token?: string): Promise<Response> {
  const { url, key } = requireConfig();
  const headers: Record<string, string> = {
    apikey: key,
    'Content-Type': 'application/json',
    ...((init.headers as Record<string, string> | undefined) ?? {})
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  try {
    return await fetch(`${url}${path}`, { ...init, headers });
  } catch {
    throw new SyncError('Keine Verbindung – bitte Internetverbindung prüfen.');
  }
}

// ===== Anmeldung =====

// Schickt einen Code an die Adresse. Der Aufruf legt auch neue Konten an.
export async function requestCode(email: string): Promise<void> {
  const res = await api('/auth/v1/otp', {
    method: 'POST',
    body: JSON.stringify({ email, create_user: true })
  });
  if (res.ok) return;

  const body = (await res.json().catch(() => null)) as { msg?: string; error_description?: string } | null;
  const message = `${body?.msg ?? ''} ${body?.error_description ?? ''}`;
  if (/rate|too many/i.test(message)) {
    throw new SyncError('Zu viele Anfragen. Bitte kurz warten und erneut versuchen.');
  }
  if (/signup.*(disabled|not allowed)|disabled/i.test(message)) {
    throw new SyncError('Zurzeit können keine neuen Konten angelegt werden.');
  }
  throw new SyncError('Der Code konnte nicht verschickt werden. Bitte E-Mail-Adresse prüfen.');
}

// Übernimmt die Antwort der Anmeldung und merkt sich die Sitzung.
interface Tokens {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  user?: { id?: string; email?: string };
}

async function startSession(res: Response, fallbackEmail: string): Promise<void> {
  const data = (await res.json()) as Tokens;
  await saveSession({
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600),
    userId: data.user?.id ?? '',
    email: data.user?.email ?? fallbackEmail
  });
}

// Bestätigt den Code und merkt sich die Sitzung.
//
// Bei einem neuen Konto schickt Supabase die Bestätigung als "signup", bei
// einem bestehenden als "email". Beide Formen werden angenommen, damit die
// Anmeldung in jedem Fall klappt.
export async function confirmCode(email: string, code: string): Promise<void> {
  const verify = (type: 'email' | 'signup') =>
    api('/auth/v1/verify', {
      method: 'POST',
      body: JSON.stringify({ email, token: code.trim(), type })
    });

  let res = await verify('email');
  if (!res.ok) res = await verify('signup');
  if (!res.ok) throw new SyncError('Der Code stimmt nicht oder ist abgelaufen.');
  await startSession(res, email);
}

// Anmeldung mit Passwort. Gedacht für das Prüfkonto der Stores: Apple und
// Google können keinen Code per E-Mail empfangen.
export async function signInWithPassword(email: string, password: string): Promise<void> {
  const res = await api('/auth/v1/token?grant_type=password', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim(), password })
  });
  if (!res.ok) throw new SyncError('E-Mail-Adresse oder Passwort stimmt nicht.');
  await startSession(res, email.trim());
}

// Gültiges Zugangstoken, erneuert es bei Bedarf.
async function token(): Promise<string> {
  const current = await loadSession();
  if (!current) throw new SyncError('Nicht angemeldet.');
  const now = Math.floor(Date.now() / 1000);
  if (current.expiresAt - 60 > now) return current.accessToken;

  const res = await api('/auth/v1/token?grant_type=refresh_token', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: current.refreshToken })
  });
  if (!res.ok) {
    await saveSession(null);
    throw new SyncError('Die Anmeldung ist abgelaufen. Bitte neu anmelden.');
  }
  const data = (await res.json()) as { access_token: string; refresh_token: string; expires_in?: number };
  await saveSession({
    ...current,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: now + (data.expires_in ?? 3600)
  });
  return data.access_token;
}

// ===== Zustand =====

export function cloudSignedIn(): boolean {
  return session !== null;
}

export function cloudEmail(): string | null {
  return session?.email ?? null;
}

// Einmalig beim Start aufrufen.
export async function initCloud(): Promise<void> {
  await loadSession();
}

// Löscht das Konto samt Daten auf dem Server und entfernt die Sitzung.
export async function deleteAccount(): Promise<void> {
  const t = await token();
  const res = await api('/functions/v1/delete-account', { method: 'POST' }, t);
  if (!res.ok) throw new SyncError('Das Konto konnte nicht gelöscht werden.');
  await saveSession(null);
}

// ===== Backend =====

export const cloudBackend: SyncBackend = {
  id: 'cloud',
  isConfigured: () => session !== null,

  async fetch(knownRev) {
    const t = await token();

    // Abkürzung: Steht der Server schon auf dieser Revision, wird der
    // vollständige Stand gar nicht erst übertragen.
    if (knownRev) {
      const head = await api('/rest/v1/rpc/sync_head', { method: 'POST', body: '{}' }, t);
      if (head.ok) {
        const rev = (await head.json()) as number | null;
        if (rev !== null && String(rev) === knownRev) return 'unchanged';
      }
    }

    const res = await api('/rest/v1/sync_state?select=data,revision', {}, t);
    if (!res.ok) throw new SyncError('Der Stand konnte nicht geladen werden.');
    const rows = (await res.json()) as { data: unknown; revision: number }[];
    if (!Array.isArray(rows) || rows.length === 0) return null;
    return { rev: String(rows[0].revision), state: sanitizeState(rows[0].data) };
  },

  async put(state: SyncState, rev) {
    const t = await token();
    const res = await api(
      '/rest/v1/rpc/sync_put',
      {
        method: 'POST',
        body: JSON.stringify({ p_expected: rev ? Number(rev) : null, p_data: state })
      },
      t
    );

    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { message?: string } | null;
      if (body?.message === 'no_entitlement') {
        throw new SyncError('Für dieses Konto ist der Sync-Dienst nicht freigeschaltet.');
      }
      if (res.status === 401) {
        throw new SyncError('Die Anmeldung ist abgelaufen. Bitte neu anmelden.');
      }
      throw new SyncError('Speichern fehlgeschlagen. Bitte später erneut versuchen.');
    }

    const next = (await res.json()) as number | null;
    if (next === null) throw new SyncConflictError('Der Stand wurde auf einem anderen Gerät geändert.');
    return String(next);
  },

  async clear() {
    await saveSession(null);
  }
};
