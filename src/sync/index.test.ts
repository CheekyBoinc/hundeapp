// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import { clearConfig, initSync, isConfigured, setConfig } from './index';

describe('Sync-Fassade', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // Muss vor dem ersten initSync laufen: Ohne aktives Backend gilt nichts als
  // eingerichtet.
  it('meldet ohne aktives Backend false', () => {
    expect(isConfigured()).toBe(false);
  });

  it('nimmt nach initSync die GitHub-Konfiguration an', async () => {
    await initSync();
    expect(isConfigured()).toBe(false);

    setConfig({ user: 'u', repo: 'r', token: 't' });
    expect(isConfigured()).toBe(true);

    clearConfig();
    expect(isConfigured()).toBe(false);
  });
});
