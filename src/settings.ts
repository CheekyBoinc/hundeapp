const KEY = 'hundeapp.settings';

export interface Settings {
  navTop: boolean;
  headerText: boolean;
  // Hund, der in der Kopfzeile steht und auf der Hunde-Seite vorausgewählt ist.
  activeDogId: string | null;
}

const DEFAULTS: Settings = {
  navTop: false,
  headerText: true,
  activeDogId: null
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
