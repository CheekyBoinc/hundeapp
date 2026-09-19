import type { AppState } from '../types';

// Gemeinsame Typen der Sync-Schicht. Bewusst frei von Transportmitteln,
// damit GitHub und der Dienst dieselben Bausteine benutzen.

export type SyncState = AppState;

export class SyncError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SyncError';
  }
}

// Der Server steht auf einer anderen Revision als erwartet. Der Aufrufer lädt
// neu, führt erneut zusammen und versucht es noch einmal.
export class SyncConflictError extends SyncError {
  constructor(message: string) {
    super(message);
    this.name = 'SyncConflictError';
  }
}

export interface SyncBackend {
  id: 'github' | 'cloud';
  isConfigured(): boolean;
  // knownRev angeben, um den vollständigen Stand zu sparen: Ist der Server
  // schon auf dieser Revision, antwortet er mit 'unchanged' statt der Daten.
  fetch(knownRev?: string): Promise<{ rev: string; state: SyncState } | 'unchanged' | null>;
  // Gibt die neue Revision zurück; wirft SyncConflictError, wenn rev veraltet ist.
  put(state: SyncState, rev?: string): Promise<string>;
  clear(): Promise<void>;
}
