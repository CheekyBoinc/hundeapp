// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import {
  deleteDog,
  discardUntouchedDemoData,
  fetchCommands,
  fetchEntries,
  hasOnlyDemoData,
  loadState,
  removeDemoData,
  saveCommand,
  saveDogProfile,
  saveEntry,
  saveWeight,
  seedDemoIfEmpty
} from './localStore';

function dog(name = 'Luna') {
  return saveDogProfile({
    name,
    rasse: null,
    geburtsdatum: null,
    geschlecht: null,
    chipNr: null,
    registerNr: null,
    tierarzt: null,
    allergien: null,
    besonderheiten: null
  });
}

beforeEach(() => {
  localStorage.clear();
});

describe('Demodaten', () => {
  it('werden nur einmal eingespielt', () => {
    seedDemoIfEmpty();
    expect(fetchEntries()).toHaveLength(2);
    expect(fetchCommands()).toHaveLength(5);
    // Nutzer löscht alles, danach darf nichts nachwachsen
    removeDemoData();
    seedDemoIfEmpty();
    expect(fetchEntries()).toHaveLength(0);
  });

  it('gelten als vorhanden, solange nichts bearbeitet wurde', () => {
    seedDemoIfEmpty();
    expect(hasOnlyDemoData()).toBe(true);
    const cmd = fetchCommands()[0];
    saveCommand({ id: cmd.id, name: cmd.name, tipp: 'Mein eigener Tipp' });
    expect(hasOnlyDemoData()).toBe(false);
  });

  it('lassen sich auch entfernen, wenn schon ein Hund angelegt ist', () => {
    seedDemoIfEmpty();
    dog();
    expect(hasOnlyDemoData()).toBe(true);
    removeDemoData();
    expect(fetchEntries()).toHaveLength(0);
    expect(fetchCommands()).toHaveLength(0);
    expect(loadState().dogs).toHaveLength(1);
    expect(hasOnlyDemoData()).toBe(false);
  });

  it('hinterlassen beim Entfernen Löschvermerke für den Sync', () => {
    seedDemoIfEmpty();
    removeDemoData();
    const { deleted } = loadState();
    expect(deleted.entries).toHaveLength(2);
    expect(deleted.commands).toHaveLength(5);
  });

  it('werden beim Verbinden nur verworfen, wenn sonst nichts da ist', () => {
    seedDemoIfEmpty();
    dog();
    discardUntouchedDemoData();
    expect(fetchEntries()).toHaveLength(2); // Hund vorhanden → nichts verwerfen
    localStorage.clear();
    seedDemoIfEmpty();
    discardUntouchedDemoData();
    expect(fetchEntries()).toHaveLength(0);
  });

  it('bearbeitete Beispieleinträge überleben das Verbinden', () => {
    seedDemoIfEmpty();
    const e = fetchEntries()[0];
    saveEntry(
      {
        id: e.id,
        date: e.date,
        ort: 'Mein Platz',
        was_gemacht: null,
        uebungsaufgaben: null,
        tipps: null,
        erledigt: false
      },
      []
    );
    discardUntouchedDemoData();
    expect(fetchEntries()).toHaveLength(2);
  });
});

describe('Kommandos und Einträge', () => {
  it('lehnt doppelte Kommandonamen ab (ohne Groß/Klein)', () => {
    saveCommand({ name: 'Sitz' });
    expect(() => saveCommand({ name: 'sitz' })).toThrow('gibt es schon');
  });

  it('kann den Hund eines Eintrags wieder entfernen', () => {
    const d = dog();
    saveEntry(
      {
        dogId: d.id,
        date: '2026-09-01',
        ort: null,
        was_gemacht: null,
        uebungsaufgaben: null,
        tipps: null,
        erledigt: false
      },
      []
    );
    const e = fetchEntries()[0];
    expect(e.dogId).toBe(d.id);
    saveEntry(
      {
        id: e.id,
        dogId: null,
        date: e.date,
        ort: null,
        was_gemacht: null,
        uebungsaufgaben: null,
        tipps: null,
        erledigt: false
      },
      []
    );
    expect(fetchEntries()[0].dogId).toBeNull();
  });

  it('aktualisiert Kommando-Kopien in Einträgen', () => {
    const c = saveCommand({ name: 'Platz', tipp: 'alt' });
    saveEntry(
      {
        date: '2026-09-01',
        ort: null,
        was_gemacht: null,
        uebungsaufgaben: null,
        tipps: null,
        erledigt: false
      },
      [c.id]
    );
    saveCommand({ id: c.id, name: 'Platz', tipp: 'neu' });
    expect(fetchEntries()[0].commands[0].tipp).toBe('neu');
  });
});

describe('Hund löschen', () => {
  it('löscht Gewichte mit und macht Einträge allgemein', () => {
    const d = dog();
    saveWeight({ dogId: d.id, date: '2026-09-01', weightKg: 12, note: null });
    saveEntry(
      {
        dogId: d.id,
        date: '2026-09-01',
        ort: null,
        was_gemacht: null,
        uebungsaufgaben: null,
        tipps: null,
        erledigt: false
      },
      []
    );
    deleteDog(d.id);
    const state = loadState();
    expect(state.dogs).toHaveLength(0);
    expect(state.weight).toHaveLength(0);
    expect(state.deleted.dogs).toContain(d.id);
    expect(state.deleted.weight).toHaveLength(1);
    expect(state.entries[0].dogId).toBeNull();
  });
});
