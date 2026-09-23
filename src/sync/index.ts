import { Preferences } from '@capacitor/preferences';
import { setActiveBackend } from './core';
import { clearConfig, githubBackend, initConfig } from './github';
import { cloudAvailable, cloudBackend, initCloud } from './cloud';

// Einstiegspunkt der Sync-Schicht. Nach außen gelten weiterhin die gewohnten
// Namen; welches Transportmittel dahinter steckt, entscheidet sich hier.
//
// Es ist immer genau ein Weg aktiv. Die Wahl wird gespeichert, damit sie einen
// Neustart übersteht.

const PROVIDER_KEY = 'hundeapp.syncProvider';

export type Provider = 'github' | 'cloud';

let provider: Provider = 'github';

export function activeProvider(): Provider {
  return provider;
}

// Wechselt den Weg und merkt sich die Wahl.
export async function setProvider(next: Provider): Promise<void> {
  provider = next === 'cloud' && cloudAvailable ? 'cloud' : 'github';
  await Preferences.set({ key: PROVIDER_KEY, value: provider }).catch(() => undefined);
  setActiveBackend(provider === 'cloud' ? cloudBackend : githubBackend);
}

// Einmalig vor dem ersten Render aufrufen.
export async function initSync(): Promise<void> {
  await initConfig();
  await initCloud().catch(() => undefined);

  const stored = (await Preferences.get({ key: PROVIDER_KEY })).value;
  provider = stored === 'cloud' && cloudAvailable ? 'cloud' : 'github';
  setActiveBackend(provider === 'cloud' ? cloudBackend : githubBackend);
}

// Entfernt die Zugangsdaten des aktiven Wegs von diesem Gerät. Die Daten
// bleiben lokal erhalten.
export async function clearActiveConfig(): Promise<void> {
  if (provider === 'cloud') await cloudBackend.clear();
  else clearConfig();
}

export {
  cloudAvailable,
  cloudEmail,
  confirmCode,
  deleteAccount,
  requestCode,
  signInWithPassword
} from './cloud';
export {
  isConfigured,
  mergeIntoLocal,
  notifyNotice,
  onChange,
  onSyncError,
  onSyncNotice,
  pullNow,
  pushNow,
  sanitizeState,
  schedulePush
} from './core';
export { clearConfig, setConfig, validateConfig } from './github';
export { SyncError } from './types';
