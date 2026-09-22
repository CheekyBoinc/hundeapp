// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import { loadSettings, saveSettings } from './settings';

const KEY = 'hundeapp.settings';

describe('settings', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('liefert die Standardwerte, wenn nichts gespeichert ist', () => {
    const s = loadSettings();
    expect(s.onboardingDone).toBe(false);
    expect(s.theme).toBe('system');
    expect(s.activeDogId).toBeNull();
  });

  it('ergänzt fehlende Felder aus einem älteren Stand', () => {
    localStorage.setItem(KEY, JSON.stringify({ navTop: true, theme: 'dark' }));
    const s = loadSettings();
    expect(s.onboardingDone).toBe(false);
    expect(s.navTop).toBe(true);
    expect(s.theme).toBe('dark');
    expect(s.headerText).toBe(true);
  });

  it('behält einen vermerkten Abschluss der Einführung', () => {
    localStorage.setItem(KEY, JSON.stringify({ onboardingDone: true }));
    expect(loadSettings().onboardingDone).toBe(true);
  });

  it('schreibt den Abschluss der Einführung mit', () => {
    saveSettings({ ...loadSettings(), onboardingDone: true });
    expect(JSON.parse(localStorage.getItem(KEY) ?? '{}').onboardingDone).toBe(true);
  });
});

describe('Erinnerungen', () => {
  it('ergänzt die Felder aus einem älteren Stand', () => {
    localStorage.setItem(KEY, JSON.stringify({ navTop: true }));
    const s = loadSettings();
    expect(s.remindHealth).toBe(false);
    expect(s.remindTraining).toBe(false);
    expect(s.trainingDays).toEqual([1, 3, 5]);
    expect(s.trainingTime).toBe('18:00');
    expect(s.reminderHintDismissed).toBe(false);
  });
});
