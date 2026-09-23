import { describe, expect, it } from 'vitest';
import { areEqual, mergeStates, pruneStaleTombstones, sanitizeState } from './core';
import type { SyncState } from './types';
import type { Command, Entry } from '../types';

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
    const { validateConfig } = await import('./github');
    const { SyncError } = await import('./types');
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

describe('areEqual', () => {
  it('ignoriert die Schlüsselreihenfolge (lokal erzeugt vs. sanitized Remote)', () => {
    // So legt localStore.saveEntry ein Objekt an: commands steht am Ende.
    const local = { ...base(), entries: [entry('e1', [])] };
    // Die Remote-Kopie kommt über JSON-Roundtrip + sanitizeState zurück und hat
    // eine andere Schlüsselreihenfolge (commands vor created_at).
    const remote = sanitizeState(JSON.parse(JSON.stringify(local)));
    expect(Object.keys(remote.entries[0])).not.toEqual(Object.keys(local.entries[0]));
    expect(areEqual(local, remote)).toBe(true);
    expect(areEqual(remote, mergeStates(local, remote))).toBe(true);
  });

  it('erkennt echte Unterschiede weiterhin', () => {
    const a = { ...base(), entries: [entry('e1', [])] };
    const b = { ...base(), entries: [{ ...entry('e1', []), ort: 'Halle' }] };
    expect(areEqual(a, b)).toBe(false);
  });
});

describe('unbekannte Felder (Vorwärtskompatibilität)', () => {
  it('übersteht sanitizeState, mergeStates und erneut sanitizeState', () => {
    const remote = sanitizeState({
      dogs: [{ id: 'd1', name: 'Luna', created_at: T1, fellfarbe: 'rot' }]
    });
    const merged = mergeStates(base(), remote);
    const again = sanitizeState(JSON.parse(JSON.stringify(merged)) as unknown);
    expect(again.dogs[0]).toMatchObject({ id: 'd1', fellfarbe: 'rot' });
  });

  it('reicht Felder auch in verschachtelten Kommandos durch', () => {
    const state = sanitizeState({
      entries: [
        {
          id: 'e1',
          date: '2026-08-20',
          commands: [{ id: 'c1', name: 'Sitz', handzeichen: 'flache Hand' }]
        }
      ]
    });
    expect(state.entries[0].commands[0]).toMatchObject({ handzeichen: 'flache Hand' });
  });

  it('verwirft Listen und Objekte', () => {
    const state = sanitizeState({
      commands: [{ id: 'c1', name: 'Sitz', tief: { a: 1 }, liste: [1, 2] }]
    });
    expect(state.commands[0]).not.toHaveProperty('tief');
    expect(state.commands[0]).not.toHaveProperty('liste');
  });

  it('lässt bekannte Felder gewinnen', () => {
    const state = sanitizeState({
      commands: [{ id: 'c1', name: 'Sitz', tipp: 'echt', erledigt: 'kein Boolean' }]
    });
    expect(state.commands[0].name).toBe('Sitz');
    expect(state.commands[0].tipp).toBe('echt');
  });

  it('ignoriert __proto__ und Schlüssel mit Unterstrich', () => {
    const roh = JSON.parse(
      '{"commands":[{"id":"c1","name":"Sitz","__proto__":{"boese":true},"_intern":1}]}'
    ) as unknown;
    const state = sanitizeState(roh);
    expect(state.commands[0]).not.toHaveProperty('_intern');
    expect(Object.getPrototypeOf(state.commands[0])).toBe(Object.prototype);
  });

  it('kappt mehr als 20 Zusatzfelder', () => {
    const roh: Record<string, unknown> = { id: 'c1', name: 'Sitz' };
    for (let i = 0; i < 25; i += 1) roh[`feld${i}`] = i;
    const state = sanitizeState({ commands: [roh] });
    const keys = Object.keys(state.commands[0]).filter((k) => k.startsWith('feld'));
    expect(keys).toHaveLength(20);
  });

  it('verwirft einen unbekannten Text über 20.000 Zeichen und behält den Datensatz', () => {
    const state = sanitizeState({
      commands: [{ id: 'c1', name: 'Sitz', notiz: 'x'.repeat(20001) }]
    });
    expect(state.commands).toHaveLength(1);
    expect(state.commands[0]).not.toHaveProperty('notiz');
  });
});

describe('Hundefoto', () => {
  const foto = `data:image/jpeg;base64,${'A'.repeat(40)}`;

  function hund(photo: unknown): Record<string, unknown> {
    return { id: 'd1', name: 'Luna', created_at: T1, photo };
  }

  it('übernimmt ein gültiges Foto', () => {
    const state = sanitizeState({ dogs: [hund(foto)] });
    expect(state.dogs[0].photo).toBe(foto);
  });

  it('lässt bei falschem Präfix nur das Feld weg', () => {
    const state = sanitizeState({ dogs: [hund('data:image/png;base64,AAA')] });
    expect(state.dogs).toHaveLength(1);
    expect(state.dogs[0].photo).toBeUndefined();
  });

  it('lässt bei Überlänge nur das Feld weg', () => {
    const zuLang = `data:image/jpeg;base64,${'A'.repeat(100001)}`;
    const state = sanitizeState({ dogs: [hund(zuLang)] });
    expect(state.dogs).toHaveLength(1);
    expect(state.dogs[0].photo).toBeUndefined();
  });
});

describe('Grenzen im Abgleich (wie beim Einspielen)', () => {
  it('verwirft überlange Freitexte, behält den Datensatz', () => {
    const state = sanitizeState({
      commands: [{ id: 'c1', name: 'Sitz', tipp: 'x'.repeat(20001) }]
    });
    expect(state.commands).toHaveLength(1);
    expect(state.commands[0].tipp).toBeNull();
  });

  it('verwirft Datensätze mit überlanger ID', () => {
    const state = sanitizeState({ commands: [{ id: 'x'.repeat(101), name: 'Sitz' }] });
    expect(state.commands).toHaveLength(0);
  });

  it('kürzt eine übergroße Liste von Löschvermerken', () => {
    const viele = Array.from({ length: 5001 }, (_, i) => `id-${i}`);
    const state = sanitizeState({ deleted: { commands: viele } });
    expect(state.deleted.commands).toHaveLength(5000);
  });

  it('normalisiert Zeitstempel weit in der Zukunft', () => {
    const state = sanitizeState({
      commands: [{ id: 'c1', name: 'Sitz', created_at: '9999-01-01T00:00:00.000Z' }]
    });
    const stamp = state.commands[0].created_at;
    expect(stamp < '2100').toBe(true);

    // Danach ist der Datensatz wieder überschreibbar.
    const gleich = new Date(Date.now() + 60 * 1000).toISOString();
    const neuer = sanitizeState({ commands: [{ id: 'c1', name: 'Sitz', created_at: gleich }] });
    const merged = mergeStates(state, neuer);
    expect(merged.commands[0].created_at).toBe(gleich);
  });

  it('zwingt Zahlen in plausible Bereiche', () => {
    const state = sanitizeState({
      stool: [{ id: 's1', dogId: 'd1', date: '2026-08-20', consistency: 99 }],
      weight: [{ id: 'w1', dogId: 'd1', date: '2026-08-20', weightKg: -3 }]
    });
    expect(state.stool[0].consistency).toBe(0);
    expect(state.weight).toHaveLength(0);
  });

  it('verwirft unbekannte Zahlen außerhalb des Bereichs', () => {
    const state = sanitizeState({
      commands: [{ id: 'c1', name: 'Sitz', grosse_zahl: 1e300, kleine_zahl: 5 }]
    });
    expect(state.commands[0]).not.toHaveProperty('grosse_zahl');
    expect(state.commands[0]).toMatchObject({ kleine_zahl: 5 });
  });
});
