import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';

// Ablage für Zugangsdaten und Sitzungen. Nativ in der sicheren Ablage des
// Systems (iOS Keychain, Android verschlüsselte SharedPreferences), im Browser
// über Capacitor Preferences. Wird von der GitHub-Konfiguration und später von
// der Sitzung des Dienstes gemeinsam benutzt.

const useSecureStore = Capacitor.isNativePlatform();

export async function readStored(key: string): Promise<string | null> {
  if (useSecureStore) {
    // Keine iCloud-Schlüsselbund-Synchronisierung: Der Wert bleibt auf dem Gerät.
    await SecureStorage.setSynchronize(false).catch(() => undefined);
    const value = await SecureStorage.get(key).catch(() => null);
    return typeof value === 'string' ? value : null;
  }
  return (await Preferences.get({ key })).value;
}

export async function writeStored(key: string, value: string): Promise<void> {
  if (useSecureStore) await SecureStorage.set(key, value);
  else await Preferences.set({ key, value });
}

export async function removeStored(key: string): Promise<void> {
  if (useSecureStore) await SecureStorage.remove(key);
  else await Preferences.remove({ key });
}
