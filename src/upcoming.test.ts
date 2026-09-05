import { describe, expect, it } from 'vitest';
import { formatDaysLeft, upcomingItems } from './upcoming';
import type { DogProfile, Vaccination, VetVisit } from './types';

const T = '2026-08-01T00:00:00.000Z';
const dogs: DogProfile[] = [
  {
    id: 'd1',
    name: 'Luna',
    rasse: null,
    geburtsdatum: null,
    geschlecht: null,
    chipNr: null,
    registerNr: null,
    tierarzt: null,
    allergien: null,
    besonderheiten: null,
    created_at: T
  }
];

function vax(id: string, nextDue: string | null): Vaccination {
  return {
    id,
    dogId: 'd1',
    date: '2026-01-01',
    name: 'Tollwut',
    nextDue,
    note: null,
    created_at: T
  };
}

function vet(id: string, followUp: string | null, reason: string | null = null): VetVisit {
  return {
    id,
    dogId: 'd1',
    date: '2026-01-01',
    clinic: null,
    reason,
    diagnosis: null,
    treatment: null,
    medication: null,
    followUp,
    note: null,
    created_at: T
  };
}

describe('upcomingItems', () => {
  it('liefert überfällige zuerst, dann nach Datum, und schneidet am Horizont ab', () => {
    const items = upcomingItems(
      [vax('v1', '2026-09-20'), vax('v2', '2026-09-01'), vax('v3', '2027-01-01')],
      [vet('t1', '2026-09-10', 'Kontrolle')],
      dogs,
      '2026-09-05',
      60
    );
    expect(items.map((i) => i.id)).toEqual(['vax-v2', 'vet-t1', 'vax-v1']);
    expect(items[0].daysLeft).toBe(-4);
    expect(items[1].title).toBe('Tierarzt: Kontrolle');
    expect(items[1].dogName).toBe('Luna');
  });

  it('ignoriert Einträge ohne Fälligkeit', () => {
    expect(upcomingItems([vax('v1', null)], [vet('t1', null)], dogs, '2026-09-05')).toEqual([]);
  });
});

describe('formatDaysLeft', () => {
  it('formuliert relativ', () => {
    expect(formatDaysLeft(-3)).toBe('seit 3 Tagen überfällig');
    expect(formatDaysLeft(-1)).toBe('seit gestern überfällig');
    expect(formatDaysLeft(0)).toBe('heute');
    expect(formatDaysLeft(1)).toBe('morgen');
    expect(formatDaysLeft(12)).toBe('in 12 Tagen');
  });
});
