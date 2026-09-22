import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { InAppReview } from '@capacitor-community/in-app-review';
import { loadState } from './localStore';
import type { Entry } from './types';

// Bewertung: nur über den Systemdialog der Stores, ohne Vorfrage und ohne
// eigenen Dialog. Die Regeln halten den Aufruf selten — erst ab zehn eigenen
// Einträgen und danach höchstens alle vier Monate.

const REVIEW_KEY = 'hundeapp.reviewRequestedAt';
const MIN_ENTRIES = 10;
const COOLDOWN_DAYS = 120;
const DAY_MS = 24 * 60 * 60 * 1000;

// Reine Regel, damit sie prüfbar bleibt.
export function shouldRequestReview(
  entries: Entry[],
  now: Date,
  lastRequest: Date | null
): boolean {
  const eigene = entries.filter((entry) => !entry.id.startsWith('demo-'));
  if (eigene.length < MIN_ENTRIES) return false;
  if (!lastRequest) return true;
  return now.getTime() - lastRequest.getTime() >= COOLDOWN_DAYS * DAY_MS;
}

async function lastRequestedAt(): Promise<Date | null> {
  const { value } = await Preferences.get({ key: REVIEW_KEY });
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : new Date(time);
}

// Nach dem Speichern eines Eintrags aufrufen. Fehler bleiben still: Ob die
// Stores den Dialog zeigen, entscheiden sie selbst.
export async function maybeRequestReview(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    if (!shouldRequestReview(loadState().entries, new Date(), await lastRequestedAt())) return;
    // Vor dem Aufruf merken: Ein zweiter Versuch soll nicht am selben Tag folgen.
    await Preferences.set({ key: REVIEW_KEY, value: new Date().toISOString() });
    await InAppReview.requestReview();
  } catch {
    // Ohne Bewertungsdialog läuft die App weiter.
  }
}
