import type { AppState } from './types';
import { loadState } from './localStore';
import { mergeIntoLocal, sanitizeState, schedulePush } from './github';
import { readFileAsText, saveFile } from './files';
import { todayLocal } from './utils';

// Sicherung als Datei: alle Daten der App als JSON. Dient dem Handywechsel
// und dem Weitergeben an ein zweites Gerät ohne GitHub-Konto.

export interface BackupFile {
  app: 'hundeapp';
  version: 1;
  exportedAt: string;
  data: AppState;
}

export interface BackupCounts {
  entries: number;
  commands: number;
  dogs: number;
}

const STATE_KEYS = ['commands', 'entries', 'dogs', 'weight', 'stool', 'vet', 'vaccinations'];

function buildBackup(): BackupFile {
  return { app: 'hundeapp', version: 1, exportedAt: new Date().toISOString(), data: loadState() };
}

function backupFilename(): string {
  return `hundeapp-sicherung-${todayLocal()}.json`;
}

// Akzeptiert die Sicherungsdatei (mit Kopf) und zur Sicherheit auch das rohe
// Datenformat, wie es im GitHub-Repo liegt.
export function parseBackup(text: string): { state: AppState; counts: BackupCounts } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Die Datei ist kein gültiges JSON.');
  }
  const obj =
    parsed !== null && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  if (!obj) throw new Error('Die Datei ist keine Hundeapp-Sicherung.');

  const raw = obj.app === 'hundeapp' && obj.data && typeof obj.data === 'object' ? obj.data : obj;
  const rawObj = raw as Record<string, unknown>;
  if (!STATE_KEYS.some((k) => Array.isArray(rawObj[k]))) {
    throw new Error('Die Datei ist keine Hundeapp-Sicherung.');
  }

  const state = sanitizeState(raw);
  return {
    state,
    counts: {
      entries: state.entries.length,
      commands: state.commands.length,
      dogs: state.dogs.length
    }
  };
}

export async function exportBackup(): Promise<void> {
  await saveFile(backupFilename(), JSON.stringify(buildBackup(), null, 2), 'application/json');
}

export async function readBackupFile(
  file: File
): Promise<{ state: AppState; counts: BackupCounts }> {
  return parseBackup(await readFileAsText(file));
}

// Führt die Sicherung mit den vorhandenen Daten zusammen (nichts wird
// überschrieben, bei gleicher ID gewinnt der neuere Stand) und stößt den
// Sync an, falls eingerichtet.
export function importBackup(state: AppState): void {
  mergeIntoLocal(state);
  schedulePush();
}

export function formatCounts(c: BackupCounts): string {
  const parts = [
    `${c.entries} ${c.entries === 1 ? 'Eintrag' : 'Einträge'}`,
    `${c.commands} ${c.commands === 1 ? 'Kommando' : 'Kommandos'}`,
    `${c.dogs} ${c.dogs === 1 ? 'Hund' : 'Hunde'}`
  ];
  return parts.join(', ');
}
