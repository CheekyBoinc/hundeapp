import { setActiveBackend } from './core';
import { githubBackend, initConfig } from './github';

// Einstiegspunkt der Sync-Schicht. Nach außen gelten weiterhin die gewohnten
// Namen; welches Transportmittel dahinter steckt, entscheidet sich hier.
//
// Bis Phase D ist GitHub der einzige Weg. Danach wählt der gespeicherte Wert
// unter `hundeapp.syncProvider` zwischen GitHub und dem Dienst.

// Einmalig vor dem ersten Render aufrufen.
export async function initSync(): Promise<void> {
  await initConfig();
  setActiveBackend(githubBackend);
}

export {
  areEqual,
  isConfigured,
  mergeIntoLocal,
  mergeStates,
  onChange,
  onSyncError,
  onSyncNotice,
  pruneStaleTombstones,
  pullNow,
  pushNow,
  sanitizeState,
  schedulePush
} from './core';
export { clearConfig, getConfig, setConfig, validateConfig } from './github';
export type { SyncConfig } from './github';
export { SyncConflictError, SyncError } from './types';
export type { SyncState } from './types';
