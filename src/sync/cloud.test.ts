// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import { cloudBackend, cloudSignedIn, confirmCode, initCloud, requestCode } from './cloud';
import { SyncConflictError, SyncError } from './types';

// Die Aufrufe gegen Supabase werden durch einen Scheinserver ersetzt: Damit
// prüfen wir die Anfrageformen und die Übersetzung der Fehler, ohne den echten
// Dienst zu berühren.

interface Answer {
  status?: number;
  body?: unknown;
}

let seen: { url: string; init?: RequestInit }[] = [];

function serve(handler: (url: string, init?: RequestInit) => Answer) {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    seen.push({ url, init });
    const { status = 200, body = {} } = handler(url, init);
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' }
    });
  }) as typeof fetch;
}

async function signIn() {
  serve((url) =>
    url.includes('/auth/v1/verify')
      ? { body: { access_token: 'token', refresh_token: 'refresh', expires_in: 3600, user: { id: 'u1' } } }
      : {}
  );
  await initCloud();
  await confirmCode('test@example.com', '123456');
}

describe('Sync-Dienst', () => {
  beforeEach(async () => {
    seen = [];
    await cloudBackend.clear();
    localStorage.clear();
  });

  it('fordert einen Code an', async () => {
    serve(() => ({ body: {} }));
    await requestCode('test@example.com');
    expect(seen[0].url).toContain('/auth/v1/otp');
    expect(String(seen[0].init?.body)).toContain('create_user');
  });

  it('übersetzt das Anfragelimit in eine verständliche Meldung', async () => {
    serve(() => ({ status: 429, body: { msg: 'Email rate limit exceeded' } }));
    await expect(requestCode('test@example.com')).rejects.toThrow(SyncError);
    await expect(requestCode('test@example.com')).rejects.toThrow('Zu viele Anfragen');
  });

  it('meldet einen falschen Code', async () => {
    serve(() => ({ status: 403, body: { msg: 'Token has expired or is invalid' } }));
    await expect(confirmCode('test@example.com', '000000')).rejects.toThrow('Der Code stimmt nicht');
  });

  it('nimmt auch die Bestätigung eines neuen Kontos an', async () => {
    let calls = 0;
    serve((url) => {
      if (url.includes('/auth/v1/verify')) {
        calls += 1;
        return calls === 1
          ? { status: 403, body: { msg: 'invalid' } }
          : { body: { access_token: 't', refresh_token: 'r', expires_in: 3600, user: { id: 'u1' } } };
      }
      return {};
    });
    await initCloud();
    await confirmCode('neu@example.com', '123456');
    expect(seen.filter((c) => c.url.includes('/auth/v1/verify')).length).toBe(2);
    expect(cloudSignedIn()).toBe(true);
  });

  it('lädt den Stand und meldet unverändert, wenn die Revision passt', async () => {
    await signIn();
    serve((url) => {
      if (url.includes('sync_head')) return { body: 4 };
      return { body: [{ data: { commands: [], entries: [] }, revision: 4 }] };
    });

    expect(await cloudBackend.fetch()).toEqual({
      rev: '4',
      state: expect.objectContaining({ commands: [], entries: [] })
    });

    seen = [];
    expect(await cloudBackend.fetch('4')).toBe('unchanged');
    expect(seen.some((c) => c.url.includes('sync_head'))).toBe(true);
    expect(seen.some((c) => c.url.includes('sync_state?'))).toBe(false);
  });

  it('meldet einen Konflikt, wenn die Revision veraltet ist', async () => {
    await signIn();
    serve(() => ({ body: null }));
    await expect(cloudBackend.put({ commands: [], entries: [], dogs: [], weight: [], stool: [], vet: [], vaccinations: [], deleted: { commands: [], entries: [], dogs: [], weight: [], stool: [], vet: [], vaccinations: [] } }, '3')).rejects.toThrow(
      SyncConflictError
    );
  });

  it('erklärt eine fehlende Freischaltung', async () => {
    await signIn();
    serve(() => ({ status: 400, body: { message: 'no_entitlement' } }));
    await expect(
      cloudBackend.put({ commands: [], entries: [], dogs: [], weight: [], stool: [], vet: [], vaccinations: [], deleted: { commands: [], entries: [], dogs: [], weight: [], stool: [], vet: [], vaccinations: [] } })
    ).rejects.toThrow('nicht freigeschaltet');
  });

  it('gibt die neue Revision zurück', async () => {
    await signIn();
    serve(() => ({ body: 5 }));
    const rev = await cloudBackend.put(
      { commands: [], entries: [], dogs: [], weight: [], stool: [], vet: [], vaccinations: [], deleted: { commands: [], entries: [], dogs: [], weight: [], stool: [], vet: [], vaccinations: [] } },
      '4'
    );
    expect(rev).toBe('5');
    const call = seen.find((c) => c.url.includes('sync_put'));
    expect(String(call?.init?.body)).toContain('"p_expected":4');
  });
});
