const KEY = 'hundeapp.settings';

import type { ThemeSetting } from './theme';

export interface Settings {
  navTop: boolean;
  headerText: boolean;
  // Hell, dunkel oder wie das System.
  theme: ThemeSetting;
  // Hund, der in der Kopfzeile steht und auf der Hunde-Seite vorausgewählt ist.
  activeDogId: string | null;
  // Einführung beim ersten Start: solange false, zeigt die App sie. Jeder
  // Schließweg setzt sie auf true; erneut aufrufbar über die Hilfe.
  onboardingDone: boolean;
  // Erinnerungen: pro Gerät, nicht abgeglichen.
  remindHealth: boolean;
  remindTraining: boolean;
  // 0 = Sonntag … 6 = Samstag.
  trainingDays: number[];
  // Uhrzeit als HH:MM.
  trainingTime: string;
  // „Nicht jetzt" beim Hinweis unter „Demnächst".
  reminderHintDismissed: boolean;
}

const DEFAULTS: Settings = {
  navTop: false,
  headerText: true,
  theme: 'system',
  activeDogId: null,
  onboardingDone: false,
  remindHealth: false,
  remindTraining: false,
  trainingDays: [1, 3, 5],
  trainingTime: '18:00',
  reminderHintDismissed: false
};

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(s: Settings): void {
  localStorage.setItem(KEY, JSON.stringify(s));
}
