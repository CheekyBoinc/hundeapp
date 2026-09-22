import { describe, expect, it } from 'vitest';
import { addMonths, dateParts, formatAge } from './utils';

describe('formatAge', () => {
  const today = new Date('2026-09-05T12:00:00');
  it('formatiert Jahre und Monate', () => {
    expect(formatAge('2024-06-01', today)).toBe('2 Jahre 3 Monate');
    expect(formatAge('2025-09-05', today)).toBe('1 Jahr');
    expect(formatAge('2026-02-10', today)).toBe('6 Monate');
    expect(formatAge('2026-08-20', today)).toBe('2 Wochen');
  });
  it('liefert null ohne oder mit zukünftigem Datum', () => {
    expect(formatAge(null, today)).toBeNull();
    expect(formatAge('2027-01-01', today)).toBeNull();
  });
});

describe('dateParts', () => {
  it('liefert Wochentag, Tag und Monat kurz', () => {
    expect(dateParts('2026-08-29')).toEqual({ weekday: 'Sa', day: '29', month: 'Aug' });
    const m = dateParts('2026-03-01');
    expect([m.weekday, m.day]).toEqual(['So', '1']);
    expect(m.month.startsWith('Mär')).toBe(true);
  });
  it('ist robust bei kaputtem Datum', () => {
    expect(dateParts('kaputt').day).toBe('–');
  });
});

describe('addMonths', () => {
  it('rechnet Monate weiter', () => {
    expect(addMonths('2026-01-15', 1)).toBe('2026-02-15');
    expect(addMonths('2026-01-15', 3)).toBe('2026-04-15');
    expect(addMonths('2026-01-15', 12)).toBe('2027-01-15');
  });

  it('rutscht am Monatsende nicht in den nächsten Monat', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29');
    expect(addMonths('2026-03-31', 1)).toBe('2026-04-30');
    expect(addMonths('2026-08-31', 6)).toBe('2027-02-28');
  });

  it('lässt ein ungültiges Datum unverändert', () => {
    expect(addMonths('kein Datum', 1)).toBe('kein Datum');
  });
});
