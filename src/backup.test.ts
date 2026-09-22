// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import {
  formatCounts,
  formatImportSummary,
  importBackup,
  parseBackup,
  previewImport,
  readBackupFile
} from './backup';
import { loadState, saveState } from './localStore';
import type {
  AppState,
  Command,
  DogProfile,
  Entry,
  StoolEntry,
  Vaccination,
  VetVisit,
  WeightEntry
} from './types';

const T1 = '2026-08-01T10:00:00.000Z';
const T2 = '2026-08-02T10:00:00.000Z';
const T3 = '2026-08-03T10:00:00.000Z';
const ZUKUNFT = '2099-01-01T00:00:00.000Z';

const rawState = {
  commands: [{ id: 'c1', name: 'Sitz', created_at: T1 }],
  entries: [{ id: 'e1', date: '2026-08-20', created_at: T1, commands: [] }],
  dogs: [],
  weight: [],
  stool: [],
  vet: [],
  vaccinations: [],
  deleted: {}
};

function leererZustand(): AppState {
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

function kommando(id: string, stempel = T1): Command {
  return {
    id,
    dogId: null,
    name: 'Sitz',
    beschreibung: null,
    tipp: null,
    created_at: stempel,
    updated_at: stempel
  };
}

function eintrag(id: string, stempel = T1): Entry {
  return {
    id,
    dogId: null,
    date: '2026-08-20',
    ort: null,
    was_gemacht: null,
    uebungsaufgaben: null,
    tipps: null,
    erledigt: false,
    created_at: stempel,
    updated_at: stempel,
    commands: []
  };
}

function hund(id: string): DogProfile {
  return {
    id,
    name: 'Luna',
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
}

function gewicht(id: string): WeightEntry {
  return {
    id,
    dogId: 'd1',
    date: '2026-08-20',
    weightKg: 12,
    note: null,
    created_at: T1,
    updated_at: T1
  };
}

function kot(id: string): StoolEntry {
  return {
    id,
    dogId: 'd1',
    date: '2026-08-20',
    consistency: 3,
    color: null,
    amount: 'normal',
    abnormal: false,
    note: null,
    created_at: T1,
    updated_at: T1
  };
}

function tierarzt(id: string): VetVisit {
  return {
    id,
    dogId: 'd1',
    date: '2026-08-20',
    clinic: null,
    reason: null,
    diagnosis: null,
    treatment: null,
    medication: null,
    followUp: null,
    note: null,
    created_at: T1,
    updated_at: T1
  };
}

function impfung(id: string): Vaccination {
  return {
    id,
    dogId: 'd1',
    date: '2026-08-20',
    name: 'Tollwut',
    nextDue: null,
    note: null,
    created_at: T1,
    updated_at: T1
  };
}

describe('parseBackup', () => {
  it('liest eine Sicherungsdatei mit Kopf', () => {
    const text = JSON.stringify({ app: 'hundeapp', version: 1, exportedAt: T1, data: rawState });
    const { state, counts } = parseBackup(text);
    expect(state.commands.map((c) => c.id)).toEqual(['c1']);
    expect(counts).toEqual({ entries: 1, commands: 1, dogs: 0, ignored: 0 });
  });

  it('akzeptiert auch das rohe Datenformat aus dem Repo', () => {
    const { counts } = parseBackup(JSON.stringify(rawState));
    expect(counts.entries).toBe(1);
  });

  it('lehnt fremde JSON-Dateien und kaputten Text ab', () => {
    expect(() => parseBackup('{"foo": 1}')).toThrow('keine Hundeapp-Sicherung');
    expect(() => parseBackup('[1,2,3]')).toThrow('keine Hundeapp-Sicherung');
    expect(() => parseBackup('kein json')).toThrow('gültiges JSON');
  });

  it('verwirft kaputte Datensätze statt zu scheitern', () => {
    const { counts } = parseBackup(
      JSON.stringify({ ...rawState, entries: [{ id: 'ohne-datum' }, ...rawState.entries] })
    );
    expect(counts.entries).toBe(1);
  });

  it('übersteht Export und Wiedereinspielen ohne Verlust', () => {
    const voll: AppState = {
      ...leererZustand(),
      commands: [kommando('c1')],
      entries: [{ ...eintrag('e1'), commands: [kommando('c1')] }],
      dogs: [hund('d1')],
      weight: [gewicht('w1')],
      stool: [kot('s1')],
      vet: [tierarzt('v1')],
      vaccinations: [impfung('i1')]
    };
    const text = JSON.stringify({ app: 'hundeapp', version: 1, exportedAt: T1, data: voll });
    const { state, counts } = parseBackup(text);
    expect(counts.ignored).toBe(0);
    expect(state).toEqual(voll);
  });
});

describe('Grenzen beim Einspielen', () => {
  it('lehnt eine zu große Datei ab, ohne sie zu lesen', async () => {
    const datei = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'hundeapp-sicherung.json');
    await expect(readBackupFile(datei)).rejects.toThrow('zu groß');
  });

  it('verwirft Zeitstempel weit in der Zukunft', () => {
    const { state, counts } = parseBackup(
      JSON.stringify({
        ...rawState,
        commands: [
          { id: 'ok', name: 'Sitz', created_at: T1 },
          { id: 'zukunft', name: 'Platz', created_at: T1, updated_at: ZUKUNFT }
        ]
      })
    );
    expect(state.commands.map((c) => c.id)).toEqual(['ok']);
    expect(counts.commands).toBe(1);
    expect(counts.ignored).toBe(1);
  });

  it('verwirft überlange IDs und überlange Freitexte', () => {
    const { state, counts } = parseBackup(
      JSON.stringify({
        ...rawState,
        commands: [
          { id: 'x'.repeat(101), name: 'Sitz', created_at: T1 },
          { id: 'lang', name: 'Platz', beschreibung: 'y'.repeat(20001), created_at: T1 },
          { id: 'kurz', name: 'Hier', created_at: T1 }
        ]
      })
    );
    expect(state.commands.map((c) => c.id)).toEqual(['kurz']);
    expect(counts.ignored).toBe(2);
  });

  it('verwirft ein unplausibles Kommando im Eintrag und behält den Eintrag', () => {
    const { state, counts } = parseBackup(
      JSON.stringify({
        ...rawState,
        entries: [
          {
            id: 'e1',
            date: '2026-08-20',
            created_at: T1,
            commands: [
              { id: 'c1', name: 'Sitz', created_at: T1 },
              { id: 'c2', name: 'Platz', created_at: ZUKUNFT }
            ]
          }
        ]
      })
    );
    expect(state.entries).toHaveLength(1);
    expect(state.entries[0].commands.map((c) => c.id)).toEqual(['c1']);
    expect(counts.ignored).toBe(1);
  });

  it('lehnt eine Datei mit zu vielen Löschvermerken als Ganzes ab', () => {
    const viele = Array.from({ length: 5001 }, (_, i) => `id-${i}`);
    const text = JSON.stringify({ ...rawState, deleted: { commands: viele } });
    expect(() => parseBackup(text)).toThrow('Löschvermerke');
  });

  it('verwirft einzelne überlange Löschvermerke und zählt sie', () => {
    const { state, counts } = parseBackup(
      JSON.stringify({ ...rawState, deleted: { commands: ['x'.repeat(101), 'echt'] } })
    );
    expect(state.deleted.commands).toEqual(['echt']);
    expect(counts.ignored).toBe(1);
  });
});

describe('Vorschau vor dem Einspielen', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('zählt neue, ersetzte und entfernte Datensätze', () => {
    const lokal = leererZustand();
    lokal.entries = [eintrag('e1', T1), eintrag('e2', T2)];
    saveState(lokal);

    const sicherung = leererZustand();
    sicherung.entries = [eintrag('e1', T3), eintrag('e3', T1)];
    sicherung.deleted.entries = ['e2'];

    expect(previewImport(sicherung)).toEqual({ neu: 1, aktualisiert: 1, loescht: 1 });
  });

  it('lässt eine ältere Sicherung nichts ersetzen', () => {
    const lokal = leererZustand();
    lokal.entries = [eintrag('e1', T3)];
    saveState(lokal);

    const sicherung = leererZustand();
    sicherung.entries = [eintrag('e1', T1)];

    expect(previewImport(sicherung)).toEqual({ neu: 0, aktualisiert: 0, loescht: 0 });
    importBackup(sicherung);
    expect(loadState().entries[0].updated_at).toBe(T3);
  });

  it('zählt Datensätze nicht als neu, wenn sie hier gelöscht sind', () => {
    const lokal = leererZustand();
    lokal.deleted.entries = ['e9'];
    saveState(lokal);

    const sicherung = leererZustand();
    sicherung.entries = [eintrag('e9', T1)];

    expect(previewImport(sicherung)).toEqual({ neu: 0, aktualisiert: 0, loescht: 0 });
  });
});

describe('formatCounts', () => {
  it('bildet Singular und Plural', () => {
    expect(formatCounts({ entries: 1, commands: 2, dogs: 0, ignored: 0 })).toBe(
      '1 Eintrag, 2 Kommandos, 0 Hunde'
    );
  });
});

describe('formatImportSummary', () => {
  it('nennt Zahlen und die Rückfrage', () => {
    const text = formatImportSummary(
      { entries: 3, commands: 2, dogs: 1, ignored: 0 },
      { neu: 2, aktualisiert: 1, loescht: 0 }
    );
    expect(text).toBe(
      'Die Datei enthält 3 Einträge, 2 Kommandos, 1 Hund. 2 Datensätze sind neu. 1 Datensatz ersetzt einen älteren Stand auf diesem Gerät. Fortfahren?'
    );
  });

  it('nennt Löschungen und übersprungene Datensätze nur, wenn es sie gibt', () => {
    const text = formatImportSummary(
      { entries: 1, commands: 0, dogs: 0, ignored: 2 },
      { neu: 0, aktualisiert: 0, loescht: 1 }
    );
    expect(text).toContain(
      '1 Löschvermerk aus der Datei entfernt einen Datensatz auf diesem Gerät.'
    );
    expect(text).toContain('2 Datensätze wurden übersprungen, weil die Angaben unplausibel sind.');
    expect(text).not.toContain('ist neu');
    expect(text.endsWith('Fortfahren?')).toBe(true);
  });
});

describe('Zusatzfelder beim Einspielen', () => {
  it('unbekannte Felder überstehen den Import', () => {
    const text = JSON.stringify({
      app: 'hundeapp',
      version: 1,
      exportedAt: T1,
      data: { ...leererZustand(), dogs: [{ ...hund('d1'), fellfarbe: 'rot' }] }
    });
    const { state, counts } = parseBackup(text);
    expect(counts.ignored).toBe(0);
    expect(state.dogs[0]).toMatchObject({ id: 'd1', fellfarbe: 'rot' });
  });

  it('ein unbekannter Text über 20.000 Zeichen kostet nicht den Datensatz', () => {
    const text = JSON.stringify({
      app: 'hundeapp',
      version: 1,
      exportedAt: T1,
      data: { ...leererZustand(), dogs: [{ ...hund('d1'), notiz: 'x'.repeat(20001) }] }
    });
    const { state, counts } = parseBackup(text);
    expect(counts.ignored).toBe(0);
    expect(state.dogs).toHaveLength(1);
    expect(state.dogs[0]).not.toHaveProperty('notiz');
  });
});

describe('Hundefoto in der Sicherung', () => {
  it('verwirft den Hund mit Foto nicht', () => {
    const foto = `data:image/jpeg;base64,${'A'.repeat(40000)}`;
    const text = JSON.stringify({
      app: 'hundeapp',
      version: 1,
      exportedAt: T1,
      data: { ...leererZustand(), dogs: [{ ...hund('d1'), photo: foto }] }
    });
    const { state, counts } = parseBackup(text);
    expect(counts.ignored).toBe(0);
    expect(state.dogs).toHaveLength(1);
    expect(state.dogs[0].photo).toBe(foto);
  });
});

