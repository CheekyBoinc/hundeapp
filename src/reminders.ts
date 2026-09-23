import type { AppState } from './types';
import type { Settings } from './settings';
import { currentHomework } from './homework';
import { vaccinationLabel } from './utils';

// Erinnerungen werden lokal auf dem Gerät geplant (kein Server, keine
// Datenweitergabe). Diese Datei rechnet nur aus, was geplant werden soll.

export interface ReminderNotification {
  id: number;
  title: string;
  body: string;
  schedule: {
    at?: Date;
    on?: { weekday: number; hour: number; minute: number };
    // Weckt das Gerät auch im Ruhezustand; ohne das kommt die Erinnerung erst,
    // wenn das Handy das nächste Mal benutzt wird.
    allowWhileIdle: boolean;
  };
  extra: { tab: 'kalender' | 'eintraege' };
  // Kein exakter Alarm: sonst öffnet Android beim Planen die Systemeinstellung
  // „Wecker und Erinnerungen".
  isExactNotification: boolean;
}

// iOS erlaubt 64 geplante Benachrichtigungen; die Übungserinnerungen (bis 7)
// kommen dazu.
const MAX_HEALTH = 50;
const HEALTH_HOUR = 9;
const MAX_TITLE = 60;
const MAX_BODY = 120;

// Texte stammen aus Nutzerdaten: auf eine Zeile bringen und begrenzen, damit
// eine Benachrichtigung nicht aus dem Rahmen läuft.
function kurz(text: string, max: number): string {
  const sauber = text.replace(/\s+/g, ' ').trim();
  return sauber.length <= max ? sauber : `${sauber.slice(0, max - 1).trimEnd()}…`;
}

// FNV-1a, 31 Bit: stabile, positive IDs (Android verlangt eine 32-Bit-Zahl).
function hashId(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 1;
}

function dayAt(date: string, hour: number, offsetDays: number): Date | null {
  const parts = date.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return null;
  const [jahr, monat, tag] = parts;
  return new Date(jahr, monat - 1, tag - offsetDays, hour, 0, 0, 0);
}

function isoDay(date: Date): string {
  const off = date.getTimezoneOffset();
  return new Date(date.getTime() - off * 60000).toISOString().slice(0, 10);
}

// Zu jedem Fälligkeitstermin zwei Erinnerungen: sieben Tage vorher und am Tag
// selbst, jeweils morgens. Vergangenes wird ausgelassen.
function healthReminders(
  id: string,
  art: 'vax' | 'vet',
  datum: string,
  beschriftung: string,
  body: string,
  now: Date
): ReminderNotification[] {
  const out: ReminderNotification[] = [];
  for (const versatz of [7, 0]) {
    const zeit = dayAt(datum, HEALTH_HOUR, versatz);
    if (!zeit || zeit.getTime() <= now.getTime()) continue;
    out.push({
      id: hashId(`${art}:${id}:${versatz}`),
      title: versatz === 0 ? `Heute fällig: ${beschriftung}` : `In 7 Tagen: ${beschriftung}`,
      body,
      schedule: { at: zeit, allowWhileIdle: true },
      extra: { tab: 'kalender' },
      isExactNotification: false
    });
  }
  return out;
}

export function planReminders(
  state: AppState,
  settings: Settings,
  now: Date
): ReminderNotification[] {
  const health: ReminderNotification[] = [];
  const training: ReminderNotification[] = [];
  const lebendeHunde = new Set(state.dogs.map((d) => d.id));
  const dogName = (id: string | null) => state.dogs.find((d) => d.id === id)?.name ?? null;

  if (settings.remindHealth) {
    for (const v of state.vaccinations) {
      if (!v.nextDue || v.id.startsWith('demo-') || !lebendeHunde.has(v.dogId)) continue;
      const name = dogName(v.dogId);
      health.push(
        ...healthReminders(
          v.id,
          'vax',
          v.nextDue,
          vaccinationLabel(v.kind),
          name ? `${v.name} – ${name}` : v.name,
          now
        )
      );
    }
    for (const v of state.vet) {
      if (!v.followUp || v.id.startsWith('demo-') || !lebendeHunde.has(v.dogId)) continue;
      const name = dogName(v.dogId);
      const grund = v.reason ?? 'Folgetermin';
      health.push(
        ...healthReminders(
          v.id,
          'vet',
          v.followUp,
          'Tierarzt',
          name ? `${grund} – ${name}` : grund,
          now
        )
      );
    }
  }

  if (settings.remindTraining) {
    // Einstellungen kommen aus dem lokalen Speicher und werden hier nicht
    // vorausgesetzt: Ein kaputter Wert darf die Gesundheitstermine nicht
    // mitreißen.
    const teile = typeof settings.trainingTime === 'string' ? settings.trainingTime.split(':') : [];
    const stunde = Number(teile[0]);
    const minute = Number(teile[1]);
    const tage = Array.isArray(settings.trainingDays) ? settings.trainingDays : [];
    const aufgaben = currentHomework(state.entries, null, isoDay(now));
    const text = kurz(aufgaben?.uebungsaufgaben ?? '', 80) || 'Ein paar Minuten Training?';
    for (const tag of tage) {
      if (!Number.isInteger(tag) || tag < 0 || tag > 6) continue;
      training.push({
        id: hashId(`training:${tag}:${settings.trainingTime}`),
        title: 'Zeit zum Üben',
        body: text,
        schedule: {
          // Das Plugin zählt Sonntag = 1 … Samstag = 7, JavaScript Sonntag = 0.
          on: {
            weekday: tag + 1,
            hour: Number.isFinite(stunde) ? stunde : 18,
            minute: Number.isFinite(minute) ? minute : 0
          },
          allowWhileIdle: true
        },
        extra: { tab: 'eintraege' },
        isExactNotification: false
      });
    }
  }

  const sortiert = [...health]
    .sort((a, b) => (a.schedule.at?.getTime() ?? 0) - (b.schedule.at?.getTime() ?? 0))
    .slice(0, MAX_HEALTH);

  // Der Hash kann doppelte IDs erzeugen: Der spätere Eintrag fällt weg, damit
  // der Plan eindeutig bleibt. Texte werden dabei gekürzt.
  const eindeutig: ReminderNotification[] = [];
  const gesehen = new Set<number>();
  for (const eintrag of [...sortiert, ...training]) {
    if (gesehen.has(eintrag.id)) continue;
    gesehen.add(eintrag.id);
    eindeutig.push({
      ...eintrag,
      title: kurz(eintrag.title, MAX_TITLE),
      body: kurz(eintrag.body, MAX_BODY)
    });
  }
  return eindeutig;
}
