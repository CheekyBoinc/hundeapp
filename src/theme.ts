import { Capacitor, registerPlugin } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

export type ThemeSetting = 'system' | 'light' | 'dark';

// Kleines natives Plugin (nur Android): färbt den Fensterhintergrund, der auf
// Android 15+ hinter der Statusleiste sichtbar ist. Siehe AppThemePlugin.java.
const AppTheme = registerPlugin<{ apply(options: { background: string }): Promise<void> }>(
  'AppTheme'
);

const SURFACE_LIGHT = '#faf7f2';
const SURFACE_DARK = '#231d19';

export function resolveTheme(setting: ThemeSetting, systemDark: boolean): 'light' | 'dark' {
  if (setting === 'system') return systemDark ? 'dark' : 'light';
  return setting;
}

function systemPrefersDark(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;
}

let current: ThemeSetting = 'system';
let listening = false;

// Setzt data-theme am Wurzelelement (steuert die CSS-Tokens) und passt
// Statusleiste sowie den nativen Fensterhintergrund an.
export function applyTheme(setting: ThemeSetting): void {
  current = setting;
  const mode = resolveTheme(setting, systemPrefersDark());
  const root = document.documentElement;
  root.dataset.theme = mode;
  root.style.colorScheme = mode;

  if (Capacitor.isNativePlatform()) {
    const dark = mode === 'dark';
    // Style.Dark = dunkler Hintergrund mit hellen Symbolen.
    StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light }).catch(() => undefined);
    if (Capacitor.getPlatform() === 'android') {
      AppTheme.apply({ background: dark ? SURFACE_DARK : SURFACE_LIGHT }).catch(() => undefined);
    }
  }

  if (!listening && typeof matchMedia === 'function') {
    listening = true;
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (current === 'system') applyTheme('system');
    });
  }
}
