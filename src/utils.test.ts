import { describe, expect, it } from 'vitest';
import { formatAge } from './utils';

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
