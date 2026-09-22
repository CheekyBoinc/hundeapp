import { describe, expect, it } from 'vitest';
import { planReminders } from './reminders';
import type { Settings } from './settings';
import type { AppState, DogProfile, Vaccination, VetVisit } from './types';

const T = '2026-08-01T00:00:00.000Z';
const JETZT = new Date('2026-09-05T08:00:00');

function settings(teil: Partial<Settings> = {}): Settings {
  return {
    navTop: false,
    headerText: true,
    theme: 'system',
    activeDogId: null,
    onboardingDone: true,
    remindHealth: false,
    remindTraining: false,
    trainingDays: [1, 3, 5],
    trainingTime: '18:00',
    reminderHintDismissed: false,
    ...teil
  };
}

function dog(id: string): DogProfile {
  return {
    id,
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
  };
}

function vax(id: string, nextDue: string | null, dogId = 'd1'): Vaccination {
  return {
    id,
    dogId,
    date: '2026-01-01',
    name: 'Tollwut',
    nextDue,
    note: null,
    created_at: T
  };
}

function vet(id: string, followUp: string | null, dogId = 'd1'): VetVisit {
  return {
    id,
    dogId,
    date: '2026-01-01',
    clinic: null,
    reason: 'Kontrolle',
    diagnosis: null,
    treatment: null,
    medication: null,
    followUp,
    note: null,
    created_at: T
  };
}

function state(teil: Partial<AppState> = {}): AppState {
  return {
    commands: [],
    entries: [],
    dogs: [dog('d1')],
    weight: [],
    stool: [],
    vet: [],
    vaccinations: [],
    deleted: {
      commands: [],
      entries: [],
      dogs: [],
      weight: [],
      stool: [],
      vet: [],
      vaccinations: []
    },
    ...teil
  };
}

describe('planReminders', () => {
  it('plant nichts, solange beide Schalter aus sind', () => {
    expect(
      planReminders(state({ vaccinations: [vax('v1', '2026-09-20')] }), settings(), JETZT)
    ).toEqual([]);
  });

  it('erinnert sieben Tage vorher und am Tag selbst', () => {
    const plan = planReminders(
      state({ vaccinations: [vax('v1', '2026-09-20')] }),
      settings({ remindHealth: true }),
      JETZT
    );
    expect(plan).toHaveLength(2);
    expect(plan[0].title).toBe('In 7 Tagen: Impfung');
    expect(plan[0].body).toBe('Tollwut – Luna');
    expect(plan[0].schedule.at?.getDate()).toBe(13);
    expect(plan[0].schedule.at?.getHours()).toBe(9);
    expect(plan[1].title).toBe('Heute fällig: Impfung');
    expect(plan[1].schedule.at?.getDate()).toBe(20);
  });

  it('lässt Vergangenes aus', () => {
    expect(
      planReminders(
        state({ vaccinations: [vax('v1', '2026-09-01')] }),
        settings({ remindHealth: true }),
        JETZT
      )
    ).toEqual([]);
  });

  it('überspringt Beispieldaten und Einträge gelöschter Hunde', () => {
    const plan = planReminders(
      state({ vaccinations: [vax('demo-v1', '2026-09-20'), vax('v2', '2026-09-20', 'weg')] }),
      settings({ remindHealth: true }),
      JETZT
    );
    expect(plan).toEqual([]);
  });

  it('nimmt Tierarzt-Folgetermine mit', () => {
    const plan = planReminders(
      state({ vet: [vet('t1', '2026-09-20')] }),
      settings({ remindHealth: true }),
      JETZT
    );
    expect(plan.map((n) => n.title)).toEqual(['In 7 Tagen: Tierarzt', 'Heute fällig: Tierarzt']);
    expect(plan[0].body).toBe('Kontrolle – Luna');
  });

  it('plant höchstens 50 Gesundheitstermine, nach Zeit sortiert', () => {
    const viele = Array.from({ length: 40 }, (_, i) => vax(`v${i}`, '2026-10-01'));
    const plan = planReminders(
      state({ vaccinations: viele }),
      settings({ remindHealth: true }),
      JETZT
    );
    expect(plan).toHaveLength(50);
    const zeiten = plan.map((n) => n.schedule.at?.getTime() ?? 0);
    expect([...zeiten].sort((a, b) => a - b)).toEqual(zeiten);
  });

  it('hält die IDs stabil', () => {
    const daten = state({ vaccinations: [vax('v1', '2026-09-20')] });
    const a = planReminders(daten, settings({ remindHealth: true }), JETZT);
    const b = planReminders(daten, settings({ remindHealth: true }), JETZT);
    expect(a.map((n) => n.id)).toEqual(b.map((n) => n.id));
    expect(a[0].id).toBeGreaterThan(0);
  });

  it('rechnet die Wochentage um', () => {
    const plan = planReminders(
      state(),
      settings({ remindTraining: true, trainingDays: [0, 6], trainingTime: '18:30' }),
      JETZT
    );
    expect(plan).toHaveLength(2);
    expect(plan[0].schedule.on).toEqual({ weekday: 1, hour: 18, minute: 30 });
    expect(plan[1].schedule.on).toEqual({ weekday: 7, hour: 18, minute: 30 });
    expect(plan[0].title).toBe('Zeit zum Üben');
  });

  it('greift die aktuellen Übungsaufgaben auf', () => {
    const plan = planReminders(
      state({
        entries: [
          {
            id: 'e1',
            dogId: null,
            date: '2026-09-04',
            ort: null,
            was_gemacht: null,
            uebungsaufgaben: 'Sitz und Platz je fünf Minuten',
            tipps: null,
            erledigt: false,
            created_at: T,
            commands: []
          }
        ]
      }),
      settings({ remindTraining: true, trainingDays: [1] }),
      JETZT
    );
    expect(plan[0].body).toBe('Sitz und Platz je fünf Minuten');
  });

  it('plant ungenaue Alarme mit Weckfunktion', () => {
    const plan = planReminders(
      state({ vaccinations: [vax('v1', '2026-09-20')] }),
      settings({ remindHealth: true, remindTraining: true, trainingDays: [1] }),
      JETZT
    );
    expect(plan.length).toBeGreaterThan(0);
    for (const n of plan) {
      expect(n.isExactNotification).toBe(false);
      expect(n.schedule.allowWhileIdle).toBe(true);
    }
  });
});
