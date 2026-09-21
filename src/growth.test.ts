import { describe, expect, it } from 'vitest';
import { findGrowth } from './growth';

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
