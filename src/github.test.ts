import { describe, expect, it } from 'vitest';
import { mergeStates, pruneStaleTombstones, sanitizeState, type SyncState } from './github';
import type { Command, Entry } from './types';

const T1 = '2026-08-01T10:00:00.000Z';
const T2 = '2026-08-02T10:00:00.000Z';
const T3 = '2026-08-03T10:00:00.000Z';

function cmd(id: string, name: string, stamp: string): Command {
  return {
    id,
    dogId: null,
    name,
    beschreibung: null,
    tipp: null,
    created_at: stamp,
    updated_at: stamp
  };
}

function entry(id: string, commands: Command[], stamp = T1): Entry {
  return {
    id,
    dogId: null,
    date: '2026-08-20',
    ort: null,
    was_gemacht: null,
    uebungsaufgaben: null,
    tipps: null,
    erledigt: false,
    created_at: stamp,
    updated_at: stamp,
    commands
  };
}

function base(): SyncState {
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

describe('mergeStates', () => {
  it('vereint disjunkte Daten beider Seiten', () => {
    const local = { ...base(), commands: [cmd('a', 'Sitz', T1)] };
    const remote = { ...base(), commands: [cmd('b', 'Platz', T1)] };
    const merged = mergeStates(local, remote);
    expect(merged.commands.map((c) => c.id).sort()).toEqual(['a', 'b']);
  });

  it('lässt bei gleicher ID den neueren Stand gewinnen', () => {
    const local = { ...base(), commands: [{ ...cmd('a', 'Sitz', T1), tipp: 'alt' }] };
    const remote = { ...base(), commands: [{ ...cmd('a', 'Sitz', T2), tipp: 'neu' }] };
    const merged = mergeStates(local, remote);
    expect(merged.commands).toHaveLength(1);
    expect(merged.commands[0].tipp).toBe('neu');
  });

  it('lässt Tombstones auch gegenüber der anderen Seite gewinnen', () => {
    const local = base();
    local.deleted.commands.push('a');
    const remote = { ...base(), commands: [cmd('a', 'Sitz', T2)] };
    const merged = mergeStates(local, remote);
    expect(merged.commands).toHaveLength(0);
    expect(merged.deleted.commands).toContain('a');
  });

  it('lenkt bei gleichem Namen mit verschiedenen IDs auf den neueren Gewinner um', () => {
    const oldCmd = cmd('id-alt', 'Sitz', T1);
    const newCmd = cmd('id-neu', 'Sitz', T2);
    const local = { ...base(), commands: [oldCmd], entries: [entry('e1', [oldCmd])] };
    const remote = { ...base(), commands: [newCmd] };
    const merged = mergeStates(local, remote);
    expect(merged.commands.map((c) => c.id)).toEqual(['id-neu']);
    expect(merged.entries[0].commands.map((c) => c.id)).toEqual(['id-neu']);
  });

  it('löst Alias-Ketten transitiv auf', () => {
    const a = cmd('a', 'Sitz', T1);
    const b = cmd('b', 'Sitz', T2);
    const c = cmd('c', 'Sitz', T3);
    const local = { ...base(), commands: [a, b], entries: [entry('e1', [a])] };
    const remote = { ...base(), commands: [c] };
    const merged = mergeStates(local, remote);
    expect(merged.commands.map((x) => x.id)).toEqual(['c']);
    expect(merged.entries[0].commands.map((x) => x.id)).toEqual(['c']);
  });

  it('entfernt Referenzen auf gelöschte Kommandos aus Einträgen', () => {
    const dead = cmd('dead', 'Platz', T1);
    const local = base();
    local.deleted.commands.push('dead');
    const remote = { ...base(), entries: [entry('e1', [dead])] };
    const merged = mergeStates(local, remote);
    expect(merged.entries[0].commands).toEqual([]);
  });

  it('ersetzt veraltete Kommando-Snapshots in Einträgen durch den aktuellen Stand', () => {
    const stale = { ...cmd('a', 'Sitz', T1), tipp: 'alt' };
    const fresh = { ...cmd('a', 'Sitz', T2), tipp: 'neu' };
    const local = { ...base(), commands: [fresh], entries: [entry('e1', [stale])] };
    const merged = mergeStates(local, base());
    expect(merged.entries[0].commands[0].tipp).toBe('neu');
  });

  it('wendet Tombstones auch auf Hunde-Listen an', () => {
    const dog = {
      id: 'd1',
      name: 'Suse',
      rasse: null,
      geburtsdatum: null,
      geschlecht: null,
      chipNr: null,
      registerNr: null,
      tierarzt: null,
      allergien: null,
      besonderheiten: null,
      created_at: T1,
      updated_at: T1
    };
    const local = { ...base(), dogs: [dog] };
    const remote = base();
    remote.deleted.dogs.push('d1');
    const merged = mergeStates(local, remote);
    expect(merged.dogs).toHaveLength(0);
    expect(merged.deleted.dogs).toContain('d1');
  });

  it('vereinigt die Tombstone-Listen beider Seiten', () => {
    const local = base();
    local.deleted.entries.push('e1');
    const remote = base();
    remote.deleted.entries.push('e2');
    const merged = mergeStates(local, remote);
    expect(merged.deleted.entries.sort()).toEqual(['e1', 'e2']);
  });
});

describe('sanitizeState', () => {
  it('ergänzt fehlende commands-Arrays und Defaults in Einträgen', () => {
    const state = sanitizeState({
      entries: [{ id: 'e1', date: '2026-08-20', created_at: T1 }]
    });
    expect(state.entries).toHaveLength(1);
    expect(state.entries[0].commands).toEqual([]);
    expect(state.entries[0].erledigt).toBe(false);
    expect(state.entries[0].ort).toBeNull();
  });

  it('verwirft Datensätze ohne Pflichtfelder', () => {
    const state = sanitizeState({
      commands: [{ name: 'Ohne ID' }, { id: 'x', name: 'Sitz' }],
      weight: [{ id: 'w1', dogId: 'd1', date: '2026-08-20' }]
    });
    expect(state.commands.map((c) => c.id)).toEqual(['x']);
    expect(state.weight).toHaveLength(0);
  });

  it('liefert bei Nicht-Objekten einen leeren Zustand', () => {
    expect(sanitizeState(null)).toEqual(base());
    expect(sanitizeState('kaputt')).toEqual(base());
    expect(sanitizeState([1, 2, 3])).toEqual(base());
  });

  it('filtert ungültige Enum-Werte, Zahlen und Tombstone-IDs', () => {
    const state = sanitizeState({
      stool: [
        { id: 's1', dogId: 'd1', date: '2026-08-20', amount: 'riesig', consistency: 'weich' }
      ],
      deleted: { commands: ['a', 42, 'b'] }
    });
    expect(state.stool[0].amount).toBeNull();
    expect(state.stool[0].consistency).toBe(0);
    expect(state.deleted.commands).toEqual(['a', 'b']);
  });
});

describe('pruneStaleTombstones', () => {
  it('behält Tombstones wirklich gelöschter Objekte', () => {
    const s = base();
    s.deleted.commands.push('geloescht');
    const out = pruneStaleTombstones(s);
    expect(out.deleted.commands).toContain('geloescht');
  });

  it('entfernt wirkungslose Tombstones, deren Objekt noch lebt', () => {
    const s = base();
    s.commands.push(cmd('a', 'Sitz', T1));
    s.deleted.commands.push('a');
    const out = pruneStaleTombstones(s);
    expect(out.deleted.commands).not.toContain('a');
    expect(out.commands.map((c) => c.id)).toContain('a');
  });

  it('dedupliziert Tombstone-Listen', () => {
    const s = base();
    s.deleted.entries.push('e1', 'e1', 'e2');
    const out = pruneStaleTombstones(s);
    expect(out.deleted.entries.sort()).toEqual(['e1', 'e2']);
  });
});

describe('Netzwerkfehler -> verständliche Meldung', () => {
  it('wirft bei Offline einen SyncError mit deutscher Meldung', async () => {
    const { SyncError, validateConfig } = await import('./github');
    const original = globalThis.fetch;
    globalThis.fetch = async () => {
      throw new TypeError('Network request failed');
    };
    const cfg = { user: 'u', repo: 'r', token: 't' };
    await expect(validateConfig(cfg)).rejects.toThrow(SyncError);
    await expect(validateConfig(cfg)).rejects.toThrow('Keine Verbindung');
    globalThis.fetch = original;
  });
});
