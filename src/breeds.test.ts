import { describe, expect, it } from 'vitest';
import { classifyWeight, findBreedRange, formatRange, STATUS_LABEL } from './breeds';

describe('findBreedRange', () => {
  it('findet die kanonische Rasse', () => {
    expect(findBreedRange('Australian Shepherd')).toEqual({ minKg: 18, maxKg: 27 });
  });

  it('findet Aliase case-insensitiv', () => {
    expect(findBreedRange('AUS')).toEqual({ minKg: 18, maxKg: 27 });
    expect(findBreedRange('australian shepherd')).toEqual({ minKg: 18, maxKg: 27 });
    expect(findBreedRange('Aus')).toEqual({ minKg: 18, maxKg: 27 });
  });

  it('ignoriert führende/folgende Leerzeichen', () => {
    expect(findBreedRange('  Labrador  ')).toEqual({ minKg: 25, maxKg: 36 });
  });

  it('erkennt Corgi inklusive Mix-Schreibweise', () => {
    expect(findBreedRange('Corgi')).toEqual({ minKg: 10, maxKg: 15 });
    expect(findBreedRange('corgi mix')).toEqual({ minKg: 10, maxKg: 15 });
    expect(findBreedRange('Welsh Corgi')).toEqual({ minKg: 10, maxKg: 15 });
  });

  it('liefert null bei unbekannter oder leerer Rasse', () => {
    expect(findBreedRange('Shar Pei')).toBeNull();
    expect(findBreedRange('')).toBeNull();
    expect(findBreedRange(null)).toBeNull();
  });
});

describe('classifyWeight', () => {
  const range = { minKg: 18, maxKg: 27 };

  it('untergewichtig unterhalb der Untergrenze', () => {
    expect(classifyWeight(17.9, range)).toBe('under');
  });

  it('im Normbereich inklusive der Grenzen', () => {
    expect(classifyWeight(18, range)).toBe('norm');
    expect(classifyWeight(22.5, range)).toBe('norm');
    expect(classifyWeight(27, range)).toBe('norm');
  });

  it('übergewichtig oberhalb der Obergrenze', () => {
    expect(classifyWeight(27.1, range)).toBe('over');
  });

  it('liefert null ohne bekannte Rasse', () => {
    expect(classifyWeight(22, null)).toBeNull();
  });
});

describe('formatRange', () => {
  it('formatiert die Spanne als kg-Bereich', () => {
    expect(formatRange({ minKg: 18, maxKg: 27 })).toBe('18–27 kg');
  });
});

describe('STATUS_LABEL', () => {
  it('hat Labels für alle Status', () => {
    expect(STATUS_LABEL.norm).toBe('Im Normbereich');
    expect(STATUS_LABEL.under).toBe('Untergewicht');
    expect(STATUS_LABEL.over).toBe('Übergewicht');
  });
});
