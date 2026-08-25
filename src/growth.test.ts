import { describe, expect, it } from 'vitest';
import { classifyGrowth, findGrowth } from './growth';

const AUS = [
  { months: 3, minKg: 5, maxKg: 8 },
  { months: 6, minKg: 11, maxKg: 16 },
  { months: 12, minKg: 17, maxKg: 24 },
  { months: 18, minKg: 18, maxKg: 27 }
];

describe('findGrowth', () => {
  it('findet die kanonische Rasse', () => {
    expect(findGrowth('Australian Shepherd')).toEqual(AUS);
  });

  it('findet Aliase case-insensitiv', () => {
    expect(findGrowth('AUS')).toEqual(AUS);
    expect(findGrowth('australian shepherd')).toEqual(AUS);
  });

  it('liefert null bei unbekannter oder leerer Rasse', () => {
    expect(findGrowth('Shar Pei')).toBeNull();
    expect(findGrowth('')).toBeNull();
    expect(findGrowth(null)).toBeNull();
  });
});

describe('classifyGrowth', () => {
  it('liefert null vor dem ersten Punkt', () => {
    expect(classifyGrowth(5, 2, AUS)).toBeNull();
  });

  it('liefert null nach dem letzten Punkt (erwachsen)', () => {
    expect(classifyGrowth(22, 24, AUS)).toBeNull();
  });

  it('klassifiziert exakt an einem Stützpunkt', () => {
    expect(classifyGrowth(5, 3, AUS)).toBe('norm');
    expect(classifyGrowth(4.9, 3, AUS)).toBe('under');
    expect(classifyGrowth(8.1, 3, AUS)).toBe('over');
  });

  it('interpoliert linear zwischen zwei Punkten', () => {
    // 3 Monate: 5–8 kg → 6 Monate: 11–16 kg. Bei 4.5 Monaten (t=0.5):
    // min 8, max 12.
    expect(classifyGrowth(8, 4.5, AUS)).toBe('norm');
    expect(classifyGrowth(7.9, 4.5, AUS)).toBe('under');
    expect(classifyGrowth(12.1, 4.5, AUS)).toBe('over');
  });
});
