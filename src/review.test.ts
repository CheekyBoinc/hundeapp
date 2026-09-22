import { describe, expect, it } from 'vitest';
import { shouldRequestReview } from './review';
import type { Entry } from './types';

const T1 = '2026-08-01T10:00:00.000Z';
const JETZT = new Date('2026-09-22T12:00:00.000Z');

function eintrag(id: string): Entry {
  return {
    id,
    dogId: null,
    date: '2026-08-20',
    ort: null,
    was_gemacht: null,
    uebungsaufgaben: null,
    tipps: null,
    erledigt: false,
    created_at: T1,
    updated_at: T1,
    commands: []
  };
}

function eintraege(anzahl: number, prefix = 'e'): Entry[] {
  return Array.from({ length: anzahl }, (_, i) => eintrag(`${prefix}${i}`));
}

describe('shouldRequestReview', () => {
  it('fragt erst ab zehn eigenen Einträgen', () => {
    expect(shouldRequestReview(eintraege(9), JETZT, null)).toBe(false);
    expect(shouldRequestReview(eintraege(10), JETZT, null)).toBe(true);
  });

  it('zählt Beispieldaten nicht mit', () => {
    expect(shouldRequestReview(eintraege(9, 'demo-'), JETZT, null)).toBe(false);
    expect(shouldRequestReview([...eintraege(9), eintrag('demo-e1')], JETZT, null)).toBe(false);
  });

  it('hält danach vier Monate Ruhe', () => {
    const vor61Tagen = new Date('2026-07-23T12:00:00.000Z');
    expect(shouldRequestReview(eintraege(10), JETZT, vor61Tagen)).toBe(false);
    const vor130Tagen = new Date('2026-05-15T12:00:00.000Z');
    expect(shouldRequestReview(eintraege(10), JETZT, vor130Tagen)).toBe(true);
  });

  it('fragt ohne Einträge nie', () => {
    expect(shouldRequestReview([], JETZT, null)).toBe(false);
  });
});
