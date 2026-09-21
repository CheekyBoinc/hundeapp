// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { pullNow, pushNow, setActiveBackend } from './core';
import type { SyncBackend, SyncState } from './types';

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

// Backend, das die Revisionsmarke mitschreibt: Der zweite Abruf soll nur noch
// die Revision nennen, damit der Dienst den vollständigen Stand nicht schickt.
function backendWithLog(calls: (string | undefined)[], rev = '7'): SyncBackend {
  return {
    id: 'cloud',
    isConfigured: () => true,
    fetch: async (knownRev) => {
      calls.push(knownRev);
      if (knownRev === rev) return 'unchanged';
      return { rev, state: emptyState() };
    },
    put: async () => '8',
    clear: async () => undefined
  };
}

describe('Revisionsmarke des Dienstes', () => {
  it('fragt beim zweiten Abruf nur noch die Revision ab', async () => {
    const calls: (string | undefined)[] = [];
    setActiveBackend(backendWithLog(calls));

    await pullNow();
    await pullNow();

    expect(calls).toEqual([undefined, '7']);
  });

  it('merkt sich die Revision aus dem Speichern', async () => {
    const calls: (string | undefined)[] = [];
    const backend = backendWithLog(calls);
    backend.fetch = async (knownRev) => {
      calls.push(knownRev);
      if (knownRev === '8') return 'unchanged';
      return null; // noch kein Stand auf dem Server
    };
    setActiveBackend(backend);

    await pushNow();
    await pullNow();

    expect(calls).toEqual([undefined, '8']);
  });

  it('vergisst die Revision beim Wechsel des Weges', async () => {
    const calls: (string | undefined)[] = [];
    setActiveBackend(backendWithLog(calls));
    await pullNow();

    const other: SyncBackend = {
      id: 'github',
      isConfigured: () => true,
      fetch: async (knownRev) => {
        calls.push(knownRev);
        return null;
      },
      put: async () => 'sha',
      clear: async () => undefined
    };
    setActiveBackend(other);
    await pullNow();

    expect(calls).toEqual([undefined, undefined]);
  });
});
