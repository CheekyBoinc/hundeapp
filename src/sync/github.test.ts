// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import { githubBackend, clearConfig, setConfig } from './github';
import { onChange, pullNow, pushNow, setActiveBackend } from './core';
import { saveState } from '../localStore';
import type { SyncState } from './types';

function leer(): SyncState {
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

function mitKommando(name: string): SyncState {
  const stand = leer();
  stand.commands.push({
    id: `c-${name}`,
    dogId: null,
    name,
    beschreibung: null,
    tipp: null,
    created_at: '2026-01-01T10:00:00.000Z',
    updated_at: '2026-01-01T10:00:00.000Z'
  });
  return stand;
}

// Schein-Server: sha und ETag hängen am Inhalt, ein PUT mit falschem sha gibt
// 409 — dasselbe Verhalten, auf das sich die App verlässt.
let inhalt: string | null = null;
let sha: string | null = null;
const anfragen: { method: string; headers: Record<string, string> }[] = [];

function shaVon(text: string): string {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return `sha-${(h >>> 0).toString(16)}`;
}

function lege(stand: SyncState): void {
  inhalt = JSON.stringify(stand);
  sha = shaVon(inhalt);
}

function antwort(status: number, body: unknown, extra: Record<string, string> = {}): Response {
  return new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...extra }
  });
}

beforeEach(() => {
  anfragen.length = 0;
  inhalt = null;
  sha = null;
  // Reihenfolge: erst wegnehmen (setzt die Merker zurück), dann neu setzen.
  clearConfig();
  setConfig({ user: 'u', repo: 'r', token: 't' });
  setActiveBackend(null);
  setActiveBackend(githubBackend);
  saveState(leer());

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = (init?.headers as Record<string, string> | undefined) ?? {};
    const method = init?.method ?? 'GET';
    anfragen.push({ method, headers });

    if (method === 'PUT') {
      const body = JSON.parse(String(init?.body)) as { content: string; sha?: string };
      if (inhalt !== null && body.sha !== sha) return antwort(409, { message: 'sha falsch' });
      inhalt = String(input).includes('/contents/') ? JSON.parse(atob(body.content)) : inhalt;
      const text = JSON.stringify(JSON.parse(atob(body.content)));
      lege(JSON.parse(text) as SyncState);
      return antwort(200, { content: { sha } });
    }

    if (inhalt === null) return antwort(404, { message: 'nicht gefunden' });
    const etag = `"${sha}"`;
    if (headers['If-None-Match'] === etag) return new Response(null, { status: 304 });
    return antwort(200, { content: btoa(inhalt), sha }, { ETag: etag });
  }) as typeof fetch;
});

describe('GitHub-Abruf mit bedingter Anfrage', () => {
  it('fragt erst unbedingt und danach bedingt an', async () => {
    lege(mitKommando('Sitz'));

    await pullNow();
    expect(anfragen).toHaveLength(1);
    expect(anfragen[0].headers['If-None-Match']).toBeUndefined();

    await pullNow();
    expect(anfragen).toHaveLength(2);
    expect(anfragen[1].headers['If-None-Match']).toBe(`"${sha}"`);
  });

  it('lädt bei einer 304 nichts hoch', async () => {
    lege(leer());
    await pullNow(); // lernt sha und ETag

    const meldungen: number[] = [];
    const ab = onChange(() => meldungen.push(1));
    await pushNow();
    ab();

    expect(anfragen.filter((a) => a.method === 'PUT')).toHaveLength(0);
    expect(meldungen).toHaveLength(0);
  });

  it('lädt bei einer 304 lokale Änderungen hoch, ohne sie vorher zu holen', async () => {
    lege(leer());
    await pullNow();

    saveState(mitKommando('Platz'));
    await pushNow();

    const puts = anfragen.filter((a) => a.method === 'PUT');
    expect(puts).toHaveLength(1);
    expect(puts[0].headers['If-None-Match']).toBeUndefined();
    expect(JSON.parse(inhalt ?? '{}').commands).toHaveLength(1);
  });

  it('bildet den ETag nach einem eigenen Speichern aus dem sha', async () => {
    await pushNow(); // noch kein Stand: Erstanlage, Antwort liefert den sha

    const nachPut = sha;
    await pullNow();

    expect(anfragen[anfragen.length - 1].headers['If-None-Match']).toBe(`"${nachPut}"`);
  });

  it('verwirft den ETag, wenn ein Abruf scheitert', async () => {
    lege(leer());
    await pullNow(); // ETag bekannt

    const echterFetch = globalThis.fetch;
    globalThis.fetch = (async () => antwort(500, { message: 'kaputt' })) as typeof fetch;
    await expect(pullNow()).rejects.toThrow();
    globalThis.fetch = echterFetch;

    await pullNow();
    expect(
      anfragen.filter((a) => a.method === 'GET').pop()?.headers['If-None-Match']
    ).toBeUndefined();
  });

  it('vergisst den ETag beim Ändern der Zugangsdaten', async () => {
    lege(leer());
    await pullNow();

    setConfig({ user: 'u', repo: 'r', token: 'neu' });
    await pullNow();

    expect(
      anfragen.filter((a) => a.method === 'GET').pop()?.headers['If-None-Match']
    ).toBeUndefined();
  });
});
