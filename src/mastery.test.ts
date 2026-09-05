import { describe, expect, it } from 'vitest';
import { masteryLevel, masteryStats } from './mastery';
import type { Entry } from './types';

const today = new Date('2026-09-05T12:00:00');

function stats(count: number, lastDate: string | null) {
  return { count, lastDate };
}

describe('masteryLevel', () => {
  it('ist 0 ohne Übungen', () => {
    expect(masteryLevel(undefined, 30, today)).toBe(0);
    expect(masteryLevel(stats(0, null), 30, today)).toBe(0);
  });

  it('steigt mit der Häufigkeit', () => {
    expect(masteryLevel(stats(1, '2026-09-01'), 30, today)).toBe(1);
    expect(masteryLevel(stats(3, '2026-09-01'), 30, today)).toBe(2);
    expect(masteryLevel(stats(6, '2026-09-01'), 30, today)).toBe(3);
  });

  it('fällt um eine Stufe, wenn lange nicht geübt wurde', () => {
    expect(masteryLevel(stats(6, '2026-06-01'), 30, today)).toBe(2);
    expect(masteryLevel(stats(3, '2026-06-01'), 30, today)).toBe(1);
    // Stufe 1 bleibt Stufe 1
    expect(masteryLevel(stats(1, '2026-01-01'), 30, today)).toBe(1);
  });
});

describe('masteryStats', () => {
  it('zählt Vorkommen und merkt das letzte Datum', () => {
    const cmd = {
      id: 'c1',
      dogId: null,
      name: 'Sitz',
      beschreibung: null,
      tipp: null,
      created_at: '2026-08-01T00:00:00.000Z'
    };
    const entry = (id: string, date: string): Entry => ({
      id,
      dogId: null,
      date,
      ort: null,
      was_gemacht: null,
      uebungsaufgaben: null,
      tipps: null,
      erledigt: false,
      created_at: '2026-08-01T00:00:00.000Z',
      commands: [cmd]
    });
    const s = masteryStats([entry('e1', '2026-08-10'), entry('e2', '2026-08-20')]);
    expect(s.get('c1')).toEqual({ count: 2, lastDate: '2026-08-20' });
  });
});
