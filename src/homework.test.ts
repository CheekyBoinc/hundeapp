import { describe, expect, it } from 'vitest';
import { currentHomework } from './homework';
import type { Entry } from './types';

const T = '2026-08-01T00:00:00.000Z';

function eintrag(
  id: string,
  date: string,
  uebungsaufgaben: string | null,
  erledigt = false,
  dogId: string | null = null
): Entry {
  return {
    id,
    dogId,
    date,
    ort: null,
    was_gemacht: null,
    uebungsaufgaben,
    tipps: null,
    erledigt,
    created_at: T,
    commands: []
  };
}

const HEUTE = '2026-09-05';

describe('currentHomework', () => {
  it('nimmt die jüngste Stunde mit offenen Aufgaben', () => {
    const offen = currentHomework(
      [eintrag('e1', '2026-08-10', 'Sitz üben'), eintrag('e2', '2026-08-20', 'Platz üben')],
      null,
      HEUTE
    );
    expect(offen?.id).toBe('e2');
  });

  it('übergeht erledigte und leere Einträge', () => {
    const offen = currentHomework(
      [
        eintrag('e1', '2026-08-20', 'Platz üben', true),
        eintrag('e2', '2026-08-18', null),
        eintrag('e3', '2026-08-15', '   '),
        eintrag('e4', '2026-08-12', 'Hier üben')
      ],
      null,
      HEUTE
    );
    expect(offen?.id).toBe('e4');
  });

  it('übergeht Einträge aus der Zukunft', () => {
    expect(currentHomework([eintrag('e1', '2026-09-20', 'Sitz üben')], null, HEUTE)).toBeNull();
  });

  it('achtet auf den Hund', () => {
    const eintraege = [
      eintrag('e1', '2026-08-20', 'Platz üben', false, 'd1'),
      eintrag('e2', '2026-08-15', 'Sitz üben', false, 'd2')
    ];
    expect(currentHomework(eintraege, 'd1', HEUTE)?.id).toBe('e1');
    expect(currentHomework(eintraege, 'd2', HEUTE)?.id).toBe('e2');
    // Ohne Hund zählen alle.
    expect(currentHomework(eintraege, null, HEUTE)?.id).toBe('e1');
  });

  it('liefert null ohne passenden Eintrag', () => {
    expect(currentHomework([], null, HEUTE)).toBeNull();
  });
});
