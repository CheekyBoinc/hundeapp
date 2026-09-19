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
}

const DEFAULTS: Settings = {
  navTop: false,
  headerText: true,
  theme: 'system',
  activeDogId: null,
  onboardingDone: false
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
