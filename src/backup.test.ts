import { describe, expect, it } from 'vitest';
import { parseBackup, formatCounts } from './backup';

const T1 = '2026-08-01T10:00:00.000Z';

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

describe('parseBackup', () => {
  it('liest eine Sicherungsdatei mit Kopf', () => {
    const text = JSON.stringify({ app: 'hundeapp', version: 1, exportedAt: T1, data: rawState });
    const { state, counts } = parseBackup(text);
    expect(state.commands.map((c) => c.id)).toEqual(['c1']);
    expect(counts).toEqual({ entries: 1, commands: 1, dogs: 0 });
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
});

describe('formatCounts', () => {
  it('bildet Singular und Plural', () => {
    expect(formatCounts({ entries: 1, commands: 2, dogs: 0 })).toBe(
      '1 Eintrag, 2 Kommandos, 0 Hunde'
    );
  });
});
