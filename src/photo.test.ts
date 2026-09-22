import { describe, expect, it } from 'vitest';
import { nextQuality } from './photo';

describe('nextQuality', () => {
  it('senkt die Qualität stufenweise', () => {
    expect(nextQuality(0.8)).toBe(0.6);
    expect(nextQuality(0.6)).toBe(0.45);
  });

  it('endet bei der kleinsten Stufe', () => {
    expect(nextQuality(0.45)).toBeNull();
  });

  it('startet bei einem unbekannten Wert oben', () => {
    expect(nextQuality(0.1)).toBe(0.8);
  });
});
