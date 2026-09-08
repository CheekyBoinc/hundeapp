import { describe, expect, it } from 'vitest';
import { escapeCsvField } from './export';
import { safeFilePart } from './files';

describe('escapeCsvField', () => {
  it('lässt normale Werte unverändert', () => {
    expect(escapeCsvField('Hundeschule')).toBe('Hundeschule');
    expect(escapeCsvField(18.5)).toBe('18.5');
    expect(escapeCsvField(null)).toBe('');
  });

  it('setzt Felder mit Komma, Anführungszeichen oder Umbruch in Anführungszeichen', () => {
    expect(escapeCsvField('Sitz, Platz')).toBe('"Sitz, Platz"');
    expect(escapeCsvField('sagt "Fein"')).toBe('"sagt ""Fein"""');
    expect(escapeCsvField('Zeile 1\r\nZeile 2')).toBe('"Zeile 1\r\nZeile 2"');
  });

  it('entschärft Formelzeichen am Anfang', () => {
    expect(escapeCsvField('=SUMME(A1)')).toBe("'=SUMME(A1)");
    expect(escapeCsvField('@cmd')).toBe("'@cmd");
    expect(escapeCsvField('-3 Schritte')).toBe("'-3 Schritte");
    expect(escapeCsvField('+49 Tel')).toBe("'+49 Tel");
  });
});

describe('safeFilePart', () => {
  it('macht aus Namen sichere Dateinamen-Bausteine', () => {
    expect(safeFilePart('Luna')).toBe('luna');
    expect(safeFilePart('Max/Moritz')).toBe('max-moritz');
    expect(safeFilePart('Frieda Müller')).toBe('frieda-mueller');
    expect(safeFilePart('  ***  ')).toBe('hund');
  });
});
