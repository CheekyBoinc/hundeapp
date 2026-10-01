// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import { pullNow, pushNow, setActiveBackend } from './core';
import { fetchCommands, saveCommand, saveState } from '../localStore';
import { SyncConflictError, type SyncBackend, type SyncState } from './types';

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

// Server-Attrappe, die sich beim Speichern wie sync_put verhält: Die erwartete
// Revision muss stimmen. null ist nur erlaubt, solange es noch keinen Stand
// gibt. Genau daran ist der Fehler aufgefallen – die frühere Attrappe hat das
// Argument ignoriert und konnte ihn deshalb nicht finden.
function makeServer(initial: { rev: string; state: SyncState } | null = null) {
  let current = initial?.state ?? null;
  let rev = Number(initial?.rev ?? 0);
  const hooks: { beforePut?: () => void } = {};
  const log: { fetch: (string | undefined)[]; put: (string | undefined)[] } = {
    fetch: [],
    put: []
  };
  const backend: SyncBackend = {
    id: 'cloud',
    isConfigured: () => true,
    fetch: async (knownRev) => {
      log.fetch.push(knownRev);
      if (!current) return null;
      if (knownRev && knownRev === String(rev)) return 'unchanged';
      return { rev: String(rev), state: current };
    },
    put: async (state, expected) => {
      log.put.push(expected);
      hooks.beforePut?.();
      if (current === null) {
        if (expected !== undefined && expected !== null) {
          throw new SyncConflictError('Es gibt schon einen Stand.');
        }
      } else if (expected !== String(rev)) {
        throw new SyncConflictError('Revision veraltet.');
      }
      current = state;
      rev += 1;
      return String(rev);
    },
    clear: async () => undefined
  };
  return {
    backend,
    hooks,
    log,
    serverState: () => current,
    serverRev: () => String(rev),
    // Simuliert das andere Gerät: schreibt direkt auf den Server.
    externalWrite: (state: SyncState) => {
      current = state;
      rev += 1;
    }
  };
}

describe('Revisionsmarke des Dienstes', () => {
  beforeEach(() => {
    // Revision und Schlüssel sind Modulzustand; er muss zwischen den Tests
    // zurückgesetzt werden, der lokale Speicher ebenso.
    setActiveBackend(null);
    saveState(emptyState());
  });

  it('fragt beim zweiten Abruf nur noch die Revision ab', async () => {
    const srv = makeServer({ rev: '7', state: emptyState() });
    setActiveBackend(srv.backend);

    await pullNow();
    await pullNow();

    expect(srv.log.fetch).toEqual([undefined, '7']);
  });

  it('merkt sich die Revision aus dem Speichern', async () => {
    const srv = makeServer();
    setActiveBackend(srv.backend);

    await pushNow();
    await pullNow();

    expect(srv.log.fetch).toEqual([undefined, '1']);
    expect(srv.log.put).toEqual([undefined]);
  });

  it('vergisst die Revision beim Wechsel des Weges', async () => {
    const first = makeServer({ rev: '7', state: emptyState() });
    setActiveBackend(first.backend);
    await pullNow();

    const second = makeServer({ rev: '9', state: emptyState() });
    setActiveBackend(second.backend);
    await pullNow();

    expect(first.log.fetch).toEqual([undefined]);
    // Ohne Zurücksetzen wäre hier die Revision des ersten Weges mitgeschickt worden.
    expect(second.log.fetch).toEqual([undefined]);
  });

  it('lädt nach einer lokalen Änderung mit der bekannten Revision hoch', async () => {
    const srv = makeServer();
    setActiveBackend(srv.backend);

    saveCommand({ name: 'Sitz' });
    await pushNow(); // Erstanlage ohne Revision
    saveCommand({ name: 'Platz' });
    await pushNow(); // Server steht auf Revision 1

    expect(srv.log.put).toEqual([undefined, '1']);
    expect(srv.log.fetch).toEqual([undefined, '1']);
    expect(srv.serverState()?.commands).toHaveLength(2);
  });

  it('lädt nichts hoch, wenn lokal nichts dazugekommen ist', async () => {
    const srv = makeServer({ rev: '1', state: emptyState() });
    setActiveBackend(srv.backend);

    await pullNow();
    await pushNow();

    expect(srv.log.put).toEqual([]);
  });

  it('löst einen Konflikt, wenn ein anderes Gerät dazwischen schreibt', async () => {
    const srv = makeServer({ rev: '1', state: emptyState() });
    setActiveBackend(srv.backend);
    await pullNow();

    saveCommand({ name: 'Sitz' });
    const fremd: SyncState = {
      ...emptyState(),
      commands: [
        {
          id: 'fremd-1',
          dogId: null,
          name: 'Fremd',
          beschreibung: null,
          tipp: null,
          created_at: '2026-01-01T10:00:00.000Z',
          updated_at: '2026-01-01T10:00:00.000Z'
        }
      ]
    };
    // Das andere Gerät schreibt genau zwischen Revisionsabfrage und Speichern.
    srv.hooks.beforePut = () => {
      srv.hooks.beforePut = undefined;
      srv.externalWrite(fremd);
    };

    await pushNow();

    expect(srv.log.put).toEqual(['1', '2']); // erster Versuch veraltet, zweiter gültig
    expect(fetchCommands().map((c) => c.name)).toEqual(['Fremd', 'Sitz']);
  });

  it('arbeitet mit einem Backend ohne Revisionsabkürzung wie bisher', async () => {
    const calls: (string | undefined)[] = [];
    let rev = '1';
    let stand = emptyState();
    const backend: SyncBackend = {
      id: 'github',
      isConfigured: () => true,
      // Backend ohne Revisionsabkürzung: knownRev wird ignoriert.
      fetch: async (knownRev) => {
        calls.push(knownRev);
        return { rev, state: stand };
      },
      put: async (state, expected) => {
        if (expected !== rev) throw new SyncConflictError('Revision veraltet.');
        stand = state;
        rev = String(Number(rev) + 1);
        return rev;
      },
      clear: async () => undefined
    };
    setActiveBackend(backend);

    await pullNow();
    saveCommand({ name: 'Sitz' });
    await pushNow();
    saveCommand({ name: 'Platz' });
    await pushNow();

    expect(calls).toEqual([undefined, '1', '2']);
    expect(stand.commands.map((c) => c.name).sort()).toEqual(['Platz', 'Sitz']);
  });

  it('setzt Revision und Schlüssel beim Wechsel zurück', async () => {
    const first = makeServer({ rev: '1', state: emptyState() });
    setActiveBackend(first.backend);
    saveCommand({ name: 'Sitz' });
    await pushNow();

    const second = makeServer();
    setActiveBackend(second.backend);
    await pushNow();

    // Ohne Zurücksetzen wäre die Revision des ersten Servers mitgeschickt worden.
    expect(second.log.fetch).toEqual([undefined]);
    expect(second.log.put).toEqual([undefined]);
  });

  it('lädt eine Änderung hoch, die während des Speicherns entstanden ist', async () => {
    const srv = makeServer();
    setActiveBackend(srv.backend);
    saveCommand({ name: 'Sitz' });

    srv.hooks.beforePut = () => {
      srv.hooks.beforePut = undefined; // nur beim ersten Speichern
      saveCommand({ name: 'Spät' });
    };

    await pushNow(); // lädt „Sitz" hoch, „Spät" entsteht dabei
    await pushNow(); // „Spät" muss jetzt mitgehen

    expect(
      srv
        .serverState()
        ?.commands.map((c) => c.name)
        .sort()
    ).toEqual(['Sitz', 'Spät']);
  });
});
